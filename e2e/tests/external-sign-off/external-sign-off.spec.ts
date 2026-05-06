import { test, expect } from '../../fixtures/auth.fixture';
import { ExternalSignOffPage } from '../../pages/external-sign-off.page';
import { TEST_USERS, TEST_ITP_INSTANCES } from '../../test-data/constants';
import { Pool } from 'pg';
import { request } from '@playwright/test';

/**
 * Creates a DB pool with standard test connection settings.
 */
function createPool(): Pool {
  return new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'itpapp',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
  });
}

/**
 * Helper to get the user ID for a test user by email.
 */
async function getUserId(pool: Pool, email: string): Promise<number> {
  const result = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (result.rows.length === 0) throw new Error(`User not found: ${email}`);
  return result.rows[0].id;
}

/**
 * Helper to get an ITP point ID from the Open ITP instance suitable for external sign-off.
 * Uses the SP (Surveillance Point) at sequence 4 to avoid HP blocking issues.
 * Also signs off the preceding HP (sequence 1) to unblock the SP.
 */
async function getSignOffPointId(pool: Pool): Promise<number> {
  // First, sign off the HP at sequence 1 so it doesn't block later points
  const hpResult = await pool.query(
    `SELECT id FROM itp_points WHERE instance_id = $1 AND type = 'HP' AND sequence = 1`,
    [TEST_ITP_INSTANCES.open.id]
  );
  if (hpResult.rows.length > 0) {
    const userResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [TEST_USERS.headContractor.email]
    );
    const hcUserId = userResult.rows[0]?.id;
    await pool.query(
      `UPDATE itp_points SET status = 'Approved'::point_status, signed_off_by = $1, signed_off_at = NOW() WHERE id = $2 AND status = 'Open'`,
      [hcUserId, hpResult.rows[0].id]
    );
  }

  const result = await pool.query(
    `SELECT id FROM itp_points WHERE instance_id = $1 AND type = 'SP' LIMIT 1`,
    [TEST_ITP_INSTANCES.open.id]
  );
  if (result.rows.length === 0) throw new Error('No SP point found in Open ITP instance');
  return result.rows[0].id;
}

/**
 * Helper to seed an external sign-off request with a token directly in the DB.
 * Returns the token string and point ID.
 */
async function seedExternalSignOffToken(options: {
  isExpired?: boolean;
  isUsed?: boolean;
}): Promise<{ token: string; pointId: number }> {
  const pool = createPool();

  try {
    const pointId = await getSignOffPointId(pool);

    // Reset the point status to Open so sign-off can proceed
    await pool.query(
      `UPDATE itp_points SET status = 'Open'::point_status, is_external_sign_off = false, external_signer_email = NULL, signed_off_by = NULL, signed_off_at = NULL WHERE id = $1`,
      [pointId]
    );

    // Invalidate any existing tokens for this point
    await pool.query(
      `UPDATE external_sign_off_tokens SET used_at = CURRENT_TIMESTAMP WHERE itp_point_id = $1 AND used_at IS NULL`,
      [pointId]
    );

    const token = `e2e-ext-signoff-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const expiresAt = options.isExpired
      ? new Date(Date.now() - 60 * 60 * 1000) // expired 1 hour ago
      : new Date(Date.now() + 48 * 60 * 60 * 1000); // valid for 48 hours
    const usedAt = options.isUsed ? new Date() : null;

    await pool.query(
      `INSERT INTO external_sign_off_tokens (itp_point_id, token, email, role_name, expires_at, used_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [pointId, token, 'external-reviewer@example.com', 'Client', expiresAt, usedAt]
    );

    return { token, pointId };
  } finally {
    await pool.end();
  }
}

test.describe('External Sign-Off', () => {
  test('internal user requests external sign-off — token generated and request recorded', async ({
    headContractorContext,
  }) => {
    const pool = createPool();
    try {
      const pointId = await getSignOffPointId(pool);

      // Reset point status
      await pool.query(
        `UPDATE itp_points SET status = 'Open'::point_status, is_external_sign_off = false, external_signer_email = NULL WHERE id = $1`,
        [pointId]
      );

      // Invalidate existing tokens for this point
      await pool.query(
        `UPDATE external_sign_off_tokens SET used_at = CURRENT_TIMESTAMP WHERE itp_point_id = $1 AND used_at IS NULL`,
        [pointId]
      );

      // Get auth token from storage state
      const storageState = await headContractorContext.storageState();
      const tokenEntry = storageState.origins
        .find((o) => o.origin === 'http://localhost:5173')
        ?.localStorage.find((item) => item.name === 'token');
      const authToken = tokenEntry?.value || '';

      // Act — request external sign-off via API
      const apiContext = await request.newContext({
        baseURL: 'http://localhost:3000',
      });

      const response = await apiContext.post('/api/external-sign-off/request', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          pointId,
          email: 'external-party@example.com',
          roleName: 'Client',
        },
      });

      // Assert — request recorded with token
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.token).toBeTruthy();
      expect(body.data.itp_point_id).toBe(pointId);
      expect(body.data.email).toBe('external-party@example.com');
      expect(body.data.role_name).toBe('Client');
      expect(body.data.expires_at).toBeTruthy();

      await apiContext.dispose();
    } finally {
      await pool.end();
    }
  });

  test('external party accesses sign-off page via valid token — ITP point context displayed', async ({
    page,
  }) => {
    // Arrange — seed a valid external sign-off token
    const { token } = await seedExternalSignOffToken({ isExpired: false, isUsed: false });

    // Act — navigate to the external sign-off page
    const signOffPage = new ExternalSignOffPage(page);
    await signOffPage.goto(token);

    // Assert — ITP point context is displayed
    await expect(signOffPage.heading).toBeVisible();
    const context = await signOffPage.getPointContext();
    expect(context.length).toBeGreaterThan(0);

    // Assert — approve button is available
    await expect(signOffPage.approveButton).toBeVisible();
  });

  test('external party submits approval — point status updates to Approved with external signer details', async ({
    page,
  }) => {
    // Arrange — seed a valid external sign-off token
    const { token, pointId } = await seedExternalSignOffToken({ isExpired: false, isUsed: false });

    // Act — navigate and submit approval
    const signOffPage = new ExternalSignOffPage(page);
    await signOffPage.goto(token);
    await signOffPage.submitApproval('Approved by external reviewer — E2E test');

    // Assert — success message displayed
    await expect(signOffPage.successMessage).toBeVisible();

    // Assert — verify point status updated in DB
    const pool = createPool();
    try {
      const result = await pool.query(
        `SELECT status, is_external_sign_off, external_signer_email FROM itp_points WHERE id = $1`,
        [pointId]
      );
      expect(result.rows[0].status).toBe('Approved');
      expect(result.rows[0].is_external_sign_off).toBe(true);
      expect(result.rows[0].external_signer_email).toBe('external-reviewer@example.com');
    } finally {
      await pool.end();
    }
  });

  test('expired token shows error message', async ({ page }) => {
    // Arrange — seed an expired token
    const { token } = await seedExternalSignOffToken({ isExpired: true });

    // Act — navigate to the external sign-off page
    const signOffPage = new ExternalSignOffPage(page);
    await signOffPage.goto(token);

    // Assert — error message is displayed
    await expect(signOffPage.errorMessage).toBeVisible();
  });

  test('used token shows error message', async ({ page }) => {
    // Arrange — seed an already-used token
    const { token } = await seedExternalSignOffToken({ isUsed: true });

    // Act — navigate to the external sign-off page
    const signOffPage = new ExternalSignOffPage(page);
    await signOffPage.goto(token);

    // Assert — error message is displayed
    await expect(signOffPage.errorMessage).toBeVisible();
  });
});

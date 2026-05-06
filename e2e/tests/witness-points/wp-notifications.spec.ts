import { test, expect } from '../../fixtures/auth.fixture';
import { WitnessPointResponsePage } from '../../pages/witness-point-response.page';
import { TEST_USERS, TEST_ITP_INSTANCES } from '../../test-data/constants';
import { Pool } from 'pg';
import { request } from '@playwright/test';
import { resetITPToStatus } from '../../helpers/db-utils';

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
 * Helper to get a WP-type ITP point ID from the Open ITP instance.
 */
async function getWitnessPointId(pool: Pool): Promise<number> {
  const result = await pool.query(
    `SELECT id FROM itp_points WHERE instance_id = $1 AND type = 'WP' LIMIT 1`,
    [TEST_ITP_INSTANCES.open.id]
  );
  if (result.rows.length === 0) throw new Error('No WP point found in Open ITP instance');
  return result.rows[0].id;
}

/**
 * Helper to seed a witness point notification with a response token directly in the DB.
 * Returns the notification ID and token string.
 */
async function seedNotificationWithToken(options: {
  isExpired?: boolean;
  isUsed?: boolean;
}): Promise<{ notificationId: number; token: string }> {
  const pool = createPool();

  try {
    const creatorId = await getUserId(pool, TEST_USERS.subcontractor.email);
    const recipientId = await getUserId(pool, TEST_USERS.headContractor.email);
    const pointId = await getWitnessPointId(pool);

    const plannedTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Clean up any existing pending notification for this point (unique index constraint)
    await pool.query(
      `UPDATE wp_notifications SET status = 'Cancelled'::wp_notification_status
       WHERE itp_point_id = $1 AND status = 'Pending'`,
      [pointId]
    );

    // Insert notification
    const notifResult = await pool.query(
      `INSERT INTO wp_notifications (itp_point_id, itp_instance_id, created_by, status, planned_inspection_time, notice_period_hours, expiry_time, location_description, scope_of_work)
       VALUES ($1, $2, $3, 'Pending'::wp_notification_status, $4, 24, $5, 'Site Area B', 'Reinforcement inspection')
       RETURNING id`,
      [pointId, TEST_ITP_INSTANCES.open.id, creatorId, plannedTime, expiryTime]
    );
    const notificationId = notifResult.rows[0].id;

    // Insert recipient
    const recipResult = await pool.query(
      `INSERT INTO wp_notification_recipients (notification_id, user_id, email, recipient_name, is_external)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [notificationId, recipientId, TEST_USERS.headContractor.email, TEST_USERS.headContractor.fullName, true]
    );
    const recipientRecordId = recipResult.rows[0].id;

    // Create response token
    const token = `e2e-wp-token-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tokenExpiry = options.isExpired
      ? new Date(Date.now() - 60 * 60 * 1000) // expired 1 hour ago
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // valid for 24 hours
    const usedAt = options.isUsed ? new Date() : null;

    await pool.query(
      `INSERT INTO wp_response_tokens (notification_id, recipient_id, token, expires_at, used_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [notificationId, recipientRecordId, token, tokenExpiry, usedAt]
    );

    return { notificationId, token };
  } finally {
    await pool.end();
  }
}

test.describe('Witness Point Notifications', () => {
  test('Subcontractor raises WP notification with planned time and recipients — status is Pending', async ({
    subcontractorContext,
  }) => {
    // Ensure ITP 9003 is Open so the backend accepts notification creation
    await resetITPToStatus(TEST_ITP_INSTANCES.open.id, 'Open');
    const pool = createPool();
    try {
      const pointId = await getWitnessPointId(pool);
      const recipientId = await getUserId(pool, TEST_USERS.headContractor.email);

      // Cancel any existing pending notification for this point
      await pool.query(
        `UPDATE wp_notifications SET status = 'Cancelled'::wp_notification_status
         WHERE itp_point_id = $1 AND status = 'Pending'`,
        [pointId]
      );

      // Act — create notification via API
      const page = await subcontractorContext.newPage();
      const apiContext = await request.newContext({
        baseURL: 'http://localhost:3000',
        storageState: undefined,
      });

      // Get the subcontractor's token from storage state
      const storageState = await subcontractorContext.storageState();
      const tokenEntry = storageState.origins
        .find((o) => o.origin === 'http://localhost:5173')
        ?.localStorage.find((item) => item.name === 'token');
      const authToken = tokenEntry?.value || '';

      const response = await apiContext.post('/api/wp-notifications', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          pointId,
          plannedInspectionTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          location: 'Site Area A',
          scope: 'Reinforcement placement check',
          recipientIds: [recipientId],
        },
      });

      // Assert
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.data.status).toBe('Pending');
      expect(body.data.itp_point_id).toBe(pointId);

      await apiContext.dispose();
      await page.close();
    } finally {
      await pool.end();
    }
  });

  test('internal recipient responds (confirm) — response recorded and status updates', async ({
    headContractorContext,
  }) => {
    // Arrange — create a notification first
    await resetITPToStatus(TEST_ITP_INSTANCES.open.id, 'Open');
    const pool = createPool();
    try {
      const creatorId = await getUserId(pool, TEST_USERS.subcontractor.email);
      const pointId = await getWitnessPointId(pool);

      // Cancel any existing pending notification for this point
      await pool.query(
        `UPDATE wp_notifications SET status = 'Cancelled'::wp_notification_status
         WHERE itp_point_id = $1 AND status = 'Pending'`,
        [pointId]
      );

      const plannedTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const notifResult = await pool.query(
        `INSERT INTO wp_notifications (itp_point_id, itp_instance_id, created_by, status, planned_inspection_time, notice_period_hours, expiry_time)
         VALUES ($1, $2, $3, 'Pending'::wp_notification_status, $4, 24, $5)
         RETURNING id`,
        [pointId, TEST_ITP_INSTANCES.open.id, creatorId, plannedTime, expiryTime]
      );
      const notificationId = notifResult.rows[0].id;

      // Act — respond via API as head contractor
      const storageState = await headContractorContext.storageState();
      const tokenEntry = storageState.origins
        .find((o) => o.origin === 'http://localhost:5173')
        ?.localStorage.find((item) => item.name === 'token');
      const authToken = tokenEntry?.value || '';

      const apiContext = await request.newContext({
        baseURL: 'http://localhost:3000',
      });

      const response = await apiContext.post(`/api/wp-notifications/${notificationId}/respond`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          responseType: 'confirm',
        },
      });

      // Assert
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data.status).toBe('Confirmed');

      await apiContext.dispose();
    } finally {
      await pool.end();
    }
  });

  test('creator cancels pending notification — status changes to Cancelled', async ({
    subcontractorContext,
  }) => {
    // Arrange — create a notification
    await resetITPToStatus(TEST_ITP_INSTANCES.open.id, 'Open');
    const pool = createPool();
    try {
      const creatorId = await getUserId(pool, TEST_USERS.subcontractor.email);
      const pointId = await getWitnessPointId(pool);

      // Cancel any existing pending notification for this point
      await pool.query(
        `UPDATE wp_notifications SET status = 'Cancelled'::wp_notification_status
         WHERE itp_point_id = $1 AND status = 'Pending'`,
        [pointId]
      );

      const plannedTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const notifResult = await pool.query(
        `INSERT INTO wp_notifications (itp_point_id, itp_instance_id, created_by, status, planned_inspection_time, notice_period_hours, expiry_time)
         VALUES ($1, $2, $3, 'Pending'::wp_notification_status, $4, 24, $5)
         RETURNING id`,
        [pointId, TEST_ITP_INSTANCES.open.id, creatorId, plannedTime, expiryTime]
      );
      const notificationId = notifResult.rows[0].id;

      // Act — cancel via API as subcontractor (the creator)
      const storageState = await subcontractorContext.storageState();
      const tokenEntry = storageState.origins
        .find((o) => o.origin === 'http://localhost:5173')
        ?.localStorage.find((item) => item.name === 'token');
      const authToken = tokenEntry?.value || '';

      const apiContext = await request.newContext({
        baseURL: 'http://localhost:3000',
      });

      const response = await apiContext.post(`/api/wp-notifications/${notificationId}/cancel`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          reason: 'Schedule changed — E2E test cancellation',
        },
      });

      // Assert
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data.status).toBe('Cancelled');

      await apiContext.dispose();
    } finally {
      await pool.end();
    }
  });

  test('external recipient accesses response page via valid token URL — context displayed and response submittable', async ({
    page,
  }) => {
    // Arrange — ensure ITP 9003 is Open, then seed notification with a valid token
    await resetITPToStatus(TEST_ITP_INSTANCES.open.id, 'Open');
    const { token } = await seedNotificationWithToken({ isExpired: false, isUsed: false });

    // Act — navigate to the response page
    const responsePage = new WitnessPointResponsePage(page);
    await responsePage.goto(token);

    // Assert — notification context is displayed
    await expect(responsePage.heading).toBeVisible();
    const context = await responsePage.getNotificationContext();
    expect(context).toContain('Reinforcement inspection');

    // Assert — response buttons are available
    await expect(responsePage.confirmButton).toBeVisible();
    await expect(responsePage.declineButton).toBeVisible();
    await expect(responsePage.rescheduleButton).toBeVisible();

    // Act — submit a confirm response
    await responsePage.confirm();

    // Assert — success message displayed
    await expect(responsePage.successMessage).toBeVisible();
  });

  test('expired token shows error message', async ({ page }) => {
    // Arrange — seed notification with an expired token
    const { token } = await seedNotificationWithToken({ isExpired: true });

    // Act — navigate to the response page
    const responsePage = new WitnessPointResponsePage(page);
    await responsePage.goto(token);

    // Assert — error message is displayed
    await expect(responsePage.errorMessage).toBeVisible();
  });

  test('used token shows error message', async ({ page }) => {
    // Arrange — seed notification with an already-used token
    const { token } = await seedNotificationWithToken({ isUsed: true });

    // Act — navigate to the response page
    const responsePage = new WitnessPointResponsePage(page);
    await responsePage.goto(token);

    // Assert — error message is displayed
    await expect(responsePage.errorMessage).toBeVisible();
  });

  test('non-Subcontractor/non-Head-Contractor user attempting to raise notification gets permission error', async ({
    clientContext,
  }) => {
    // Arrange
    const pool = createPool();
    try {
      const pointId = await getWitnessPointId(pool);
      const recipientId = await getUserId(pool, TEST_USERS.headContractor.email);

      // Act — attempt to create notification as Client (role 3)
      const storageState = await clientContext.storageState();
      const tokenEntry = storageState.origins
        .find((o) => o.origin === 'http://localhost:5173')
        ?.localStorage.find((item) => item.name === 'token');
      const authToken = tokenEntry?.value || '';

      const apiContext = await request.newContext({
        baseURL: 'http://localhost:3000',
      });

      const response = await apiContext.post('/api/wp-notifications', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          pointId,
          plannedInspectionTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          location: 'Site Area C',
          scope: 'Unauthorized attempt',
          recipientIds: [recipientId],
        },
      });

      // Assert — permission error
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('Only Subcontractors and Head Contractors');

      await apiContext.dispose();
    } finally {
      await pool.end();
    }
  });
});

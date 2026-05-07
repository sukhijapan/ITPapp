import { test, expect } from '../../fixtures/auth.fixture';
import { ForgotPasswordPage } from '../../pages/forgot-password.page';
import { ResetPasswordPage } from '../../pages/reset-password.page';
import { TEST_USERS } from '../../test-data/constants';
import { Pool } from 'pg';
import crypto from 'crypto';

/**
 * Inserts a password reset token directly into the DB and returns the raw token.
 * The backend stores a SHA-256 hash; we generate both here so the test gets the
 * raw token that the reset-password URL requires.
 */
async function requestResetAndGetToken(email: string): Promise<string> {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'itpapp',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    const userResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );
    if (userResult.rows.length === 0) {
      throw new Error(`User not found: ${email}`);
    }
    const userId = userResult.rows[0].id;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO password_resets (user_id, token, created_at, expires_at)
       VALUES ($1, $2, NOW(), $3)`,
      [userId, tokenHash, expiresAt]
    );

    return rawToken;
  } finally {
    await pool.end();
  }
}

test.describe('Authentication - Password Reset', () => {
  test.describe.configure({ mode: 'serial' });

  test('should show generic success message on forgot password form regardless of email existence', async ({
    page,
  }) => {
    // Arrange
    const forgotPasswordPage = new ForgotPasswordPage(page);

    // Act — submit with a known existing email
    await forgotPasswordPage.goto();
    await forgotPasswordPage.submitEmail(TEST_USERS.admin.email);

    // Assert — generic success message shown
    await expect(forgotPasswordPage.successMessage).toBeVisible();

    // Act — submit with a non-existent email
    await forgotPasswordPage.goto();
    await forgotPasswordPage.submitEmail('nonexistent@example.com');

    // Assert — same generic success message shown (no information leakage)
    await expect(forgotPasswordPage.successMessage).toBeVisible();
  });

  test('should allow password change when valid reset token is used', async ({ page }) => {
    // Arrange — request a password reset and get the token from DB
    const resetPasswordPage = new ResetPasswordPage(page);
    const token = await requestResetAndGetToken(TEST_USERS.admin.email);

    // Act
    await resetPasswordPage.goto(token);
    await resetPasswordPage.resetPassword('NewSecurePass456!');

    // Assert — success message or redirect indicates password was changed
    await expect(resetPasswordPage.successMessage).toBeVisible();
  });
});

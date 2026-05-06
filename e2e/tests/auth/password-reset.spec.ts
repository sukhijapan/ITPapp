import { test, expect } from '../../fixtures/auth.fixture';
import { ForgotPasswordPage } from '../../pages/forgot-password.page';
import { ResetPasswordPage } from '../../pages/reset-password.page';
import { TEST_USERS } from '../../test-data/constants';
import { Pool } from 'pg';
import { request } from '@playwright/test';

/**
 * Helper to request a password reset via the API and retrieve the token from the database.
 */
async function requestResetAndGetToken(email: string): Promise<string> {
  // Call the forgot-password API endpoint
  const apiContext = await request.newContext({
    baseURL: 'http://localhost:3000',
  });

  await apiContext.post('/api/auth/forgot-password', {
    data: { email },
  });
  await apiContext.dispose();

  // Query the database for the reset token
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'itpapp',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    const result = await pool.query(
      `SELECT pr.token FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE u.email = $1
       ORDER BY pr.created_at DESC
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error(`No password reset token found for ${email}`);
    }

    return result.rows[0].token;
  } finally {
    await pool.end();
  }
}

test.describe('Authentication - Password Reset', () => {
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

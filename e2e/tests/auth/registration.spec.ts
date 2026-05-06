import { test, expect } from '../../fixtures/auth.fixture';
import { RegisterPage } from '../../pages/register.page';
import { Pool } from 'pg';

/**
 * Helper to create an invitation token directly in the database.
 * Returns the token string that can be used to navigate to /register/{token}.
 */
async function createInvitationToken(
  email: string,
  roleId: number,
  expiresAt?: Date
): Promise<string> {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'itpapp',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    const token = `e2e-invite-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const expires = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    await pool.query(
      `INSERT INTO invitations (email, role_id, token, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token) DO UPDATE SET
         email = EXCLUDED.email,
         role_id = EXCLUDED.role_id,
         expires_at = EXCLUDED.expires_at`,
      [email, roleId, token, expires]
    );

    return token;
  } finally {
    await pool.end();
  }
}

test.describe('Authentication - Registration', () => {
  test('should allow registration with valid invitation token and redirect to dashboard', async ({
    page,
  }) => {
    // Arrange
    const registerPage = new RegisterPage(page);
    const email = `e2e-register-${Date.now()}@test.local`;
    const token = await createInvitationToken(email, 1); // Subcontractor role

    // Act
    await registerPage.goto(token);
    await registerPage.register('NewSecurePass123!');

    // Assert — user should be redirected to dashboard after successful registration
    await page.waitForURL('**/');
    expect(page.url()).not.toContain('/register');
  });

  test('should show error message when expired or invalid token is used', async ({ page }) => {
    // Arrange
    const registerPage = new RegisterPage(page);
    const invalidToken = 'invalid-token-that-does-not-exist';

    // Act
    await registerPage.goto(invalidToken);

    // Assert
    await expect(registerPage.errorMessage).toBeVisible();
  });
});

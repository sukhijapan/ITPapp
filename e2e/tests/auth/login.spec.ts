import { test, expect } from '../../fixtures/auth.fixture';
import { LoginPage } from '../../pages/login.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { TEST_USERS, DEACTIVATED_USER } from '../../test-data/constants';

test.describe('Authentication - Login', () => {
  test('should redirect to dashboard and show welcome message after valid login @smoke @critical', async ({
    page,
  }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const user = TEST_USERS.subcontractor;

    // Act
    await loginPage.goto();
    await loginPage.login(user.email, user.password);

    // Assert
    await page.waitForURL('**/');
    const welcomeText = await dashboardPage.getWelcomeText();
    expect(welcomeText).toContain(user.fullName);
  });

  test('should show error message and stay on login page when invalid credentials are submitted', async ({
    page,
  }) => {
    // Arrange
    const loginPage = new LoginPage(page);

    // Act
    await loginPage.goto();
    await loginPage.login('invalid@example.com', 'WrongPassword123!');

    // Assert
    await expect(loginPage.errorMessage).toBeVisible();
    expect(page.url()).toContain('/login');
  });

  test('should show generic error when deactivated user attempts login (no information leakage)', async ({
    page,
  }) => {
    // Arrange
    const loginPage = new LoginPage(page);

    // Act
    await loginPage.goto();
    await loginPage.login(DEACTIVATED_USER.email, DEACTIVATED_USER.password);

    // Assert
    await expect(loginPage.errorMessage).toBeVisible();
    // The error message should be generic — same as invalid credentials
    const errorText = await loginPage.errorMessage.textContent();
    expect(errorText).not.toContain('deactivated');
    expect(errorText).not.toContain('inactive');
    expect(page.url()).toContain('/login');
  });
});

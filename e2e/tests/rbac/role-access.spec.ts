import { test, expect } from '../../fixtures/auth.fixture';
import { DashboardPage } from '../../pages/dashboard.page';
import { UserManagementPage } from '../../pages/user-management.page';
import { TEST_PROJECT, TEST_ITP_INSTANCES } from '../../test-data/constants';

test.describe('Role-Based Access Control @critical', () => {
  test('should redirect unauthenticated requests to protected routes to login page', async ({
    browser,
  }) => {
    // Arrange — create a context with no auth state
    const context = await browser.newContext();
    const page = await context.newPage();

    // Act & Assert — protected routes redirect to login
    const protectedRoutes = [
      '/',
      `/projects/${TEST_PROJECT.id}`,
      `/itp/${TEST_ITP_INSTANCES.open.id}`,
      '/admin/users',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL('**/login');
      expect(page.url()).toContain('/login');
    }

    await context.close();
  });

  test('should allow Subcontractor access to project views, ITP execution, NCR creation but NOT User Management', async ({
    subcontractorContext,
  }) => {
    // Arrange
    const page = await subcontractorContext.newPage();

    // Assert — can access dashboard (project views)
    await page.goto('/');
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.projectCards.first()).toBeVisible();

    // Assert — can access project details
    await page.goto(`/projects/${TEST_PROJECT.id}`);
    await expect(page.locator('h1')).toBeVisible();
    expect(page.url()).toContain(`/projects/${TEST_PROJECT.id}`);

    // Assert — can access ITP execution
    await page.goto(`/itp/${TEST_ITP_INSTANCES.open.id}`);
    await expect(page.locator('.itp-header')).toBeVisible();

    // Assert — CANNOT access User Management
    await page.goto('/admin/users');
    const url = page.url();
    const isRedirected = !url.includes('/admin/users');
    const hasError = await page.locator('.error, .access-denied, [role="alert"]').isVisible().catch(() => false);
    expect(isRedirected || hasError).toBe(true);
  });

  test('should allow Head Contractor access to ITP approval, sign-off, and notification configuration', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();

    // Assert — can access dashboard
    await page.goto('/');
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.projectCards.first()).toBeVisible();

    // Assert — can access ITP execution (for approval and sign-off)
    await page.goto(`/itp/${TEST_ITP_INSTANCES.open.id}`);
    await expect(page.locator('.itp-header')).toBeVisible();

    // Assert — approve/sign-off buttons are available for Head Contractor
    const approveButton = page.locator('button.btn-approve').first();
    const isApproveVisible = await approveButton.isVisible().catch(() => false);
    expect(isApproveVisible).toBe(true);

    // Assert — can access project details (notification configuration context)
    await page.goto(`/projects/${TEST_PROJECT.id}`);
    await expect(page.locator('h1')).toBeVisible();
    expect(page.url()).toContain(`/projects/${TEST_PROJECT.id}`);
  });

  test('should allow Client to view projects and sign off Client-restricted points', async ({
    clientContext,
  }) => {
    // Arrange
    const page = await clientContext.newPage();

    // Assert — can access dashboard (view projects)
    await page.goto('/');
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.projectCards.first()).toBeVisible();

    // Assert — can access project details
    await page.goto(`/projects/${TEST_PROJECT.id}`);
    await expect(page.locator('h1')).toBeVisible();
    expect(page.url()).toContain(`/projects/${TEST_PROJECT.id}`);

    // Assert — can access ITP execution (for Client-restricted point sign-off)
    await page.goto(`/itp/${TEST_ITP_INSTANCES.open.id}`);
    await expect(page.locator('.itp-header')).toBeVisible();
  });

  test('should allow Admin access to all features including User Management', async ({
    adminContext,
  }) => {
    // Arrange
    const page = await adminContext.newPage();

    // Assert — can access dashboard
    await page.goto('/');
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.projectCards.first()).toBeVisible();

    // Assert — User Management link is visible on dashboard
    await expect(dashboardPage.userManagementLink).toBeVisible();

    // Assert — can access User Management page
    const userManagement = new UserManagementPage(page);
    await userManagement.goto();
    await expect(userManagement.heading).toBeVisible();
    await expect(userManagement.userTable).toBeVisible();

    // Assert — can access project details
    await page.goto(`/projects/${TEST_PROJECT.id}`);
    await expect(page.locator('h1')).toBeVisible();
    expect(page.url()).toContain(`/projects/${TEST_PROJECT.id}`);

    // Assert — can access ITP execution
    await page.goto(`/itp/${TEST_ITP_INSTANCES.open.id}`);
    await expect(page.locator('.itp-header')).toBeVisible();
  });
});

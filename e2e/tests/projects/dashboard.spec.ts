import { test, expect } from '../../fixtures/auth.fixture';
import { DashboardPage } from '../../pages/dashboard.page';
import { ProjectDetailsPage } from '../../pages/project-details.page';
import { TEST_PROJECT } from '../../test-data/constants';

test.describe('Project Management - Dashboard', () => {
  test('should display project cards and statistics for authenticated user @smoke', async ({
    subcontractorContext,
  }) => {
    // Arrange
    const page = await subcontractorContext.newPage();
    const dashboardPage = new DashboardPage(page);

    // Act
    await dashboardPage.goto();

    // Assert — project cards are visible
    await expect(dashboardPage.projectCards.first()).toBeVisible();
    const cardCount = await dashboardPage.projectCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Assert — stat cards display expected statistics
    await expect(dashboardPage.statCards.first()).toBeVisible();
    const statLabels = ['Open ITPs', 'Blocking HPs', 'Open NCRs', 'Pending Review', 'Closed ITPs'];
    for (const label of statLabels) {
      await expect(page.locator('.stat-card', { hasText: label })).toBeVisible();
    }
  });

  test('should navigate to project details with ITP instances and template options when clicking project card', async ({
    subcontractorContext,
  }) => {
    // Arrange
    const page = await subcontractorContext.newPage();
    const dashboardPage = new DashboardPage(page);
    const projectDetailsPage = new ProjectDetailsPage(page);

    // Act
    await dashboardPage.goto();
    await dashboardPage.clickProject(TEST_PROJECT.name);

    // Assert — navigated to project details
    await expect(projectDetailsPage.projectNameHeading).toBeVisible();
    await expect(projectDetailsPage.projectNameHeading).toContainText(TEST_PROJECT.name);

    // Assert — ITP instances list is present
    await expect(projectDetailsPage.itpInstancesList.first()).toBeVisible();

    // Assert — template management options are available
    await expect(projectDetailsPage.templateSection).toBeVisible();
  });

  test('should show User Management link for Admin user', async ({ adminContext }) => {
    // Arrange
    const page = await adminContext.newPage();
    const dashboardPage = new DashboardPage(page);

    // Act
    await dashboardPage.goto();

    // Assert
    await expect(dashboardPage.userManagementLink).toBeVisible();
  });

  test('should NOT show User Management link for non-Admin user', async ({
    subcontractorContext,
  }) => {
    // Arrange
    const page = await subcontractorContext.newPage();
    const dashboardPage = new DashboardPage(page);

    // Act
    await dashboardPage.goto();

    // Assert
    await expect(dashboardPage.userManagementLink).not.toBeVisible();
  });
});

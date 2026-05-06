import { test, expect } from '../../fixtures/auth.fixture';
import { TemplateLibraryPage } from '../../pages/template-library.page';
import { ProjectDetailsPage } from '../../pages/project-details.page';
import { TEST_PROJECT, TEST_TEMPLATE } from '../../test-data/constants';

test.describe('ITP Template Library', () => {
  test('should display public templates grouped by trade category on library page', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const libraryPage = new TemplateLibraryPage(page);

    // Act
    await libraryPage.goto(TEST_PROJECT.id);

    // Assert — template cards are visible
    await expect(libraryPage.templateCards.first()).toBeVisible();
    const cardCount = await libraryPage.templateCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Assert — trade category filters are displayed for grouping
    await expect(libraryPage.tradeFilters.first()).toBeVisible();
  });

  test('should create a copy in the target project when cloning a library template', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const libraryPage = new TemplateLibraryPage(page);
    const projectDetails = new ProjectDetailsPage(page);

    // Act — clone a template from the library
    await libraryPage.goto(TEST_PROJECT.id);
    const firstCard = libraryPage.templateCards.first();
    const templateName = await firstCard.locator('.card-title, h3, h4').textContent() ?? '';
    await libraryPage.cloneTemplate(templateName.trim());

    // Assert — cloned template appears in the project's template list
    await projectDetails.goto(TEST_PROJECT.id);
    await expect(projectDetails.templateSection).toContainText(templateName.trim());
  });

  test('should make template visible in global library when publishing a project template', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const projectDetails = new ProjectDetailsPage(page);
    const libraryPage = new TemplateLibraryPage(page);

    // Act — navigate to project and publish the seeded template
    await projectDetails.goto(TEST_PROJECT.id);
    const templateRow = projectDetails.templateSection.locator('.list-item', {
      hasText: TEST_TEMPLATE.name,
    });
    await templateRow.locator('button', { hasText: /publish/i }).click();

    // Handle publish dialog — select trade category if prompted
    const categorySelect = page.locator('select, .trade-category-select');
    if (await categorySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await categorySelect.selectOption({ index: 1 });
    }
    const confirmPublish = page.locator('button', { hasText: /confirm|publish/i });
    if (await confirmPublish.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmPublish.click();
    }

    // Assert — template is now visible in the global library
    await libraryPage.goto(TEST_PROJECT.id);
    await expect(libraryPage.templateCards.filter({ hasText: TEST_TEMPLATE.name })).toBeVisible();
  });
});

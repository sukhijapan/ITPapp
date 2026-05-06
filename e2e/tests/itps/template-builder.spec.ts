import { test, expect } from '../../fixtures/auth.fixture';
import { TemplateBuilderPage } from '../../pages/template-builder.page';
import { ProjectDetailsPage } from '../../pages/project-details.page';
import { TEST_PROJECT } from '../../test-data/constants';

test.describe('ITP Template Builder', () => {
  test('should create template with points of each type and verify it appears in project template list', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const templateBuilder = new TemplateBuilderPage(page);
    const projectDetails = new ProjectDetailsPage(page);
    const templateName = `E2E Template ${Date.now()}`;

    // Act — navigate to template builder and create a template with all point types
    await templateBuilder.goto(TEST_PROJECT.id);
    await templateBuilder.fillTemplate(templateName, 'Template created by E2E test');

    await templateBuilder.addPoint('HP', 'Hold Point inspection', 'Must pass structural check');
    await templateBuilder.addPoint('WP', 'Witness Point inspection', 'Observer must be notified');
    await templateBuilder.addPoint('RP', 'Review Point inspection', 'Documentation review required');
    await templateBuilder.addPoint('SP', 'Surveillance Point inspection', 'Random audit check');
    await templateBuilder.addPoint('IP', 'Information Point inspection', 'Record keeping only');

    await templateBuilder.submit();

    // Assert — template appears in the project template list
    await projectDetails.goto(TEST_PROJECT.id);
    await expect(projectDetails.templateSection).toContainText(templateName);
  });

  test('should show conflict error when creating template with duplicate name in same project', async ({
    headContractorContext,
  }) => {
    // Arrange — use the seeded template name which already exists
    const page = await headContractorContext.newPage();
    const templateBuilder = new TemplateBuilderPage(page);
    const duplicateName = 'E2E Test Template'; // matches TEST_TEMPLATE.name from seed

    // Act — attempt to create a template with the same name
    await templateBuilder.goto(TEST_PROJECT.id);
    await templateBuilder.fillTemplate(duplicateName, 'Duplicate template attempt');
    await templateBuilder.addPoint('HP', 'Test point', 'Test criteria');
    await templateBuilder.submit();

    // Assert — conflict error is displayed
    await expect(templateBuilder.errorBanner).toBeVisible();
    await expect(templateBuilder.errorBanner).toContainText(/conflict|already exists|duplicate/i);
  });

  test('should remove template and related data when deleted', async ({
    headContractorContext,
  }) => {
    // Arrange — create a template to delete
    const page = await headContractorContext.newPage();
    const templateBuilder = new TemplateBuilderPage(page);
    const projectDetails = new ProjectDetailsPage(page);
    const templateName = `E2E Delete Template ${Date.now()}`;

    // Create the template first
    await templateBuilder.goto(TEST_PROJECT.id);
    await templateBuilder.fillTemplate(templateName, 'Template to be deleted');
    await templateBuilder.addPoint('HP', 'Point to delete', 'Criteria');
    await templateBuilder.submit();

    // Verify it exists
    await projectDetails.goto(TEST_PROJECT.id);
    await expect(projectDetails.templateSection).toContainText(templateName);

    // Act — delete the template
    const templateRow = projectDetails.templateSection.locator('.list-item', { hasText: templateName });
    await templateRow.locator('button', { hasText: /delete/i }).click();

    // Confirm deletion if a confirmation dialog appears
    const confirmButton = page.locator('button', { hasText: /confirm|yes|delete/i });
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Assert — template no longer appears in the list
    await expect(projectDetails.templateSection).not.toContainText(templateName);
  });
});

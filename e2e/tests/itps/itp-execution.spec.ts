import { test, expect } from '../../fixtures/auth.fixture';
import { ITPExecutionPage } from '../../pages/itp-execution.page';
import { ProjectDetailsPage } from '../../pages/project-details.page';
import { TEST_PROJECT, TEST_TEMPLATE, TEST_ITP_INSTANCES } from '../../test-data/constants';

test.describe('ITP Execution @critical', () => {
  test('should create ITP instance from template with Draft status and all points copied', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const projectDetails = new ProjectDetailsPage(page);
    const itpExecution = new ITPExecutionPage(page);

    // Act — create an ITP instance from the seeded template
    await projectDetails.goto(TEST_PROJECT.id);
    await projectDetails.clickCreateITP(TEST_TEMPLATE.name);

    // Assert — ITP is created in Draft status
    const status = await itpExecution.getStatus();
    expect(status.trim()).toBe('Draft');

    // Assert — all template points are copied (seeded template has 5 points)
    const pointCount = await itpExecution.pointCards.count();
    expect(pointCount).toBe(5);
  });

  test('should change status to Pending Review when Subcontractor submits Draft ITP', async ({
    subcontractorContext,
  }) => {
    // Arrange
    const page = await subcontractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Act — navigate to the Draft ITP and submit for review
    await itpExecution.goto(TEST_ITP_INSTANCES.draft.id);
    await itpExecution.submitForReview();

    // Assert — status changes to Pending Review
    await expect(itpExecution.statusBadge).toContainText('Pending Review');
  });

  test('should change status to Open when Head Contractor approves Pending Review ITP', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Act — navigate to the Pending Review ITP and approve
    await itpExecution.goto(TEST_ITP_INSTANCES.pendingReview.id);
    await itpExecution.approveITP();

    // Assert — status changes to Open
    await expect(itpExecution.statusBadge).toContainText('Open');
  });

  test('should return status to Draft with rejection reason when Head Contractor rejects Pending Review ITP', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);
    const rejectionReason = 'Missing documentation for hold point';

    // Act — navigate to the Pending Review ITP and reject with reason
    await itpExecution.goto(TEST_ITP_INSTANCES.pendingReview.id);
    await itpExecution.rejectITP(rejectionReason);

    // Assert — status returns to Draft
    await expect(itpExecution.statusBadge).toContainText('Draft');

    // Assert — rejection reason is preserved/visible
    await expect(page.locator('text=' + rejectionReason)).toBeVisible();
  });

  test('should update point status and record signer info when authorized user signs off point', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Act — navigate to the Open ITP and sign off the first point
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);
    await itpExecution.signOffPoint(0);

    // Assert — point status updates to approved
    const firstPoint = itpExecution.pointCards.nth(0);
    await expect(firstPoint.locator('.status-badge, .point-status')).toContainText(/approved|signed/i);

    // Assert — signer information is recorded
    await expect(firstPoint).toContainText(/signed|approved by/i);
  });

  test('should show blocking error when signing off point blocked by preceding unsigned HP', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Act — navigate to the Open ITP and attempt to sign off a point that is blocked
    // by a preceding unsigned Hold Point (point at index > 0 when HP at index 0 is unsigned)
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);
    await itpExecution.signOffPoint(1); // attempt to sign point after HP

    // Assert — blocking error is displayed
    await expect(itpExecution.errorBanner).toBeVisible();
    await expect(itpExecution.errorBanner).toContainText(/block|hold point|preceding/i);
  });

  test('should auto-change ITP status to Closed when all points are signed off', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Act — navigate to the Open ITP and sign off all points sequentially
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);
    const pointCount = await itpExecution.pointCards.count();

    for (let i = 0; i < pointCount; i++) {
      // Only sign off points that have a visible approve button (not already signed)
      const card = itpExecution.pointCards.nth(i);
      const approveBtn = card.locator('button.btn-approve');
      if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await approveBtn.click();
        // Wait for the sign-off to process
        await page.waitForTimeout(500);
      }
    }

    // Wait for the auto-close to reflect in the UI (may need a page refresh)
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Assert — ITP status automatically changes to Closed
    await expect(itpExecution.statusBadge).toContainText('Closed', { timeout: 10000 });
  });

  test('should show permission error when wrong role attempts sign-off on role-restricted point', async ({
    subcontractorContext,
  }) => {
    // Arrange — Subcontractor should not be able to sign off a Head Contractor restricted point
    const page = await subcontractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Act — navigate to the Open ITP and attempt to sign off a role-restricted point
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);
    await itpExecution.signOffPoint(0); // HP typically restricted to Head Contractor

    // Assert — permission error is displayed
    await expect(itpExecution.errorBanner).toBeVisible();
    await expect(itpExecution.errorBanner).toContainText(/permission|unauthorized|not allowed|role/i);
  });
});

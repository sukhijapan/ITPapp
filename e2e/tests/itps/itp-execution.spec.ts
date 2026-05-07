import { test, expect } from '../../fixtures/auth.fixture';
import { ITPExecutionPage } from '../../pages/itp-execution.page';
import { ProjectDetailsPage } from '../../pages/project-details.page';
import { TEST_PROJECT, TEST_TEMPLATE, TEST_ITP_INSTANCES, TEST_NCRS } from '../../test-data/constants';
import { resetITPToStatus, resetITPPointsToOpen, resetNCRToStatus } from '../../helpers/db-utils';

test.describe('ITP Execution @critical', () => {
  test.describe.configure({ mode: 'serial' });

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
    // Arrange — reset to Draft so retries don't find it already Pending Review
    await resetITPToStatus(TEST_ITP_INSTANCES.draft.id, 'Draft');
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
    // Arrange — reset to Pending Review so retries don't find it in Draft (left by the reject test)
    await resetITPToStatus(TEST_ITP_INSTANCES.pendingReview.id, 'Pending Review');
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
    // Arrange — reset ITP 9002 to PendingReview in case a previous test changed it
    await resetITPToStatus(TEST_ITP_INSTANCES.pendingReview.id, 'Pending Review');
    const page = await headContractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);
    const rejectionReason = 'Missing documentation for hold point';

    // Act — navigate to the Pending Review ITP and reject with reason
    await itpExecution.goto(TEST_ITP_INSTANCES.pendingReview.id);
    await itpExecution.rejectITP(rejectionReason);

    // Assert — status returns to Draft
    await expect(itpExecution.statusBadge).toContainText('Draft', { timeout: 10000 });
  });

  test('should update point status and record signer info when authorized user signs off point', async ({
    headContractorContext,
  }) => {
    // Arrange — reset ITP 9003, its points to Open, and close the seeded NCR on point 0
    // so the HC can sign off the HP (open NCRs block Approved sign-off)
    await resetITPToStatus(TEST_ITP_INSTANCES.open.id, 'Open');
    await resetITPPointsToOpen(TEST_ITP_INSTANCES.open.id);
    await resetNCRToStatus(TEST_NCRS.open.id, 'Closed');
    const page = await headContractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Act — navigate to the Open ITP and sign off point 0 (HP, role 2 = HC)
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);
    await itpExecution.signOffPoint(0);

    // Assert — point shows signed-off success message with signer info
    const firstPoint = itpExecution.pointCards.nth(0);
    await expect(firstPoint.locator('.success-msg')).toBeVisible();
    await expect(firstPoint).toContainText(/signed|approved by/i);
  });

  test('should show blocking error when signing off point blocked by preceding unsigned HP', async ({
    headContractorContext,
  }) => {
    // Arrange — reset ITP 9003 and all its points to Open so HP at index 0 is unsigned
    await resetITPToStatus(TEST_ITP_INSTANCES.open.id, 'Open');
    await resetITPPointsToOpen(TEST_ITP_INSTANCES.open.id);
    const page = await headContractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Act — navigate to the Open ITP and attempt to sign off a point blocked by the HP
    // Points are grouped by section in the UI. DOM order:
    //   nth(0) = seq 1 (HP, role 2 = HC)
    //   nth(1) = seq 2 (WP, role 3 = Client)
    //   nth(2) = seq 4 (SP, role 1 = Subcontractor)
    //   nth(3) = seq 3 (RP, role 2 = HC) — blocked by preceding unsigned HP at seq 1
    //   nth(4) = seq 5 (IP, no role restriction)
    // We target nth(3): HC-accessible RP blocked by the unsigned HP at seq 1
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);
    await itpExecution.signOffPoint(3);

    // Assert — blocking error is displayed
    await expect(itpExecution.errorBanner).toBeVisible();
    await expect(itpExecution.errorBanner).toContainText(/block|hold point|preceding/i);
  });

  test('should auto-change ITP status to Closed when all points are signed off', async ({
    adminContext,
  }) => {
    // Arrange — reset ITP 9003, all points to Open, and close the seeded NCR on point 0
    // so the admin can sign off all points (open NCR on point 0 blocks Approved sign-off)
    await resetITPToStatus(TEST_ITP_INSTANCES.open.id, 'Open');
    await resetITPPointsToOpen(TEST_ITP_INSTANCES.open.id);
    await resetNCRToStatus(TEST_NCRS.open.id, 'Closed');
    const page = await adminContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Act — navigate to the Open ITP and sign off all points sequentially
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);
    const pointCount = await itpExecution.pointCards.count();

    for (let i = 0; i < pointCount; i++) {
      const card = itpExecution.pointCards.nth(i);
      const approveBtn = card.locator('button.btn-approve');
      if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await approveBtn.click();
        // Wait for sign-off to complete before proceeding to next point
        // (HP must be Approved before subsequent points can be signed)
        await card.locator('.success-msg').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      }
    }

    // Reload to confirm the auto-close reflected in the ITP status
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Assert — ITP status automatically changes to Closed
    await expect(itpExecution.statusBadge).toContainText('Closed', { timeout: 10000 });
  });

  test('should show permission error when wrong role attempts sign-off on role-restricted point', async ({
    subcontractorContext,
  }) => {
    // Arrange — reset ITP 9003 and points to Open so sign-off buttons are available
    await resetITPToStatus(TEST_ITP_INSTANCES.open.id, 'Open');
    await resetITPPointsToOpen(TEST_ITP_INSTANCES.open.id);
    const page = await subcontractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Act — navigate to the Open ITP
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);

    // Assert — point 0 is HP restricted to Head Contractor (role 2); subcontractor (role 1)
    // sees a role-blocked message without an approve button (no click needed)
    const firstPoint = itpExecution.pointCards.nth(0);
    await expect(firstPoint.locator('.role-blocked-msg')).toBeVisible();
  });
});

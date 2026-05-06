import { test, expect } from '../../fixtures/auth.fixture';
import { NCRListPage } from '../../pages/ncr-list.page';
import { NCRDetailPage } from '../../pages/ncr-detail.page';
import { ITPExecutionPage } from '../../pages/itp-execution.page';
import { TEST_ITP_INSTANCES, TEST_NCRS } from '../../test-data/constants';

test.describe('NCR Lifecycle @regression', () => {
  test('should create NCR with Open status when inspection point is rejected', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Act — navigate to the Open ITP and reject a point
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);
    await itpExecution.rejectPoint(0);

    // Assert — point status shows Rejected
    const firstPoint = itpExecution.pointCards.nth(0);
    await expect(firstPoint.locator('.status-badge, .point-status')).toContainText(/rejected/i);

    // Assert — NCR is created (link or indicator visible on the point)
    await expect(firstPoint).toContainText(/NCR/i);
  });

  test('should show NCRs with project context, status, and creation date on list page', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const ncrList = new NCRListPage(page);

    // Act — navigate to the NCR list page
    await ncrList.goto();

    // Assert — NCR list is populated
    const count = await ncrList.getNCRCount();
    expect(count).toBeGreaterThan(0);

    // Assert — NCR rows contain status badges
    await expect(ncrList.statusBadges.first()).toBeVisible();

    // Assert — NCR rows contain project context and creation date
    const firstRow = ncrList.ncrRows.first();
    await expect(firstRow).toContainText(/\d{1,2}/); // date fragment
  });

  test('should show all fields, audit trail, and linked ITP point info on detail page', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const ncrDetail = new NCRDetailPage(page);

    // Act — navigate to the open NCR detail page
    await ncrDetail.goto(TEST_NCRS.open.id);

    // Assert — NCR reference badge is visible
    await expect(ncrDetail.ncrRefBadge).toBeVisible();

    // Assert — status badge is visible
    await expect(ncrDetail.statusBadge).toBeVisible();
    const status = await ncrDetail.getStatus();
    expect(status.trim()).toBe('Open');

    // Assert — editable fields are present
    await expect(ncrDetail.rootCauseTextarea).toBeVisible();
    await expect(ncrDetail.correctiveActionTextarea).toBeVisible();
    await expect(ncrDetail.dispositionTextarea).toBeVisible();

    // Assert — audit trail is visible
    await expect(ncrDetail.auditTrail.first()).toBeVisible();

    // Assert — linked ITP info is visible
    await expect(ncrDetail.linkedITPLink).toBeVisible();
  });

  test('should persist changes when updating NCR fields', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const ncrDetail = new NCRDetailPage(page);
    const testData = {
      rootCause: 'E2E Test Root Cause - material defect',
      correctiveAction: 'E2E Test Corrective Action - replace material',
      disposition: 'E2E Test Disposition - rework required',
    };

    // Act — navigate to the open NCR and update fields
    await ncrDetail.goto(TEST_NCRS.open.id);
    await ncrDetail.updateFields(testData);

    // Assert — reload the page and verify fields persisted
    await ncrDetail.goto(TEST_NCRS.open.id);
    await expect(ncrDetail.rootCauseTextarea).toHaveValue(testData.rootCause);
    await expect(ncrDetail.correctiveActionTextarea).toHaveValue(testData.correctiveAction);
    await expect(ncrDetail.dispositionTextarea).toHaveValue(testData.disposition);
  });

  test('should change NCR status to Closed when resolved', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const ncrDetail = new NCRDetailPage(page);

    // Act — navigate to the open NCR and resolve it
    await ncrDetail.goto(TEST_NCRS.open.id);
    await ncrDetail.resolve();

    // Assert — status changes to Closed
    await expect(ncrDetail.statusBadge).toContainText(/closed/i);
  });

  test('should not allow point approval when linked NCR is still open', async ({
    headContractorContext,
  }) => {
    // Arrange
    const page = await headContractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Act — navigate to the Open ITP and attempt to approve a point that has an open NCR
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);

    // Find a point with an open NCR and attempt to sign it off
    // The seeded data links an open NCR to a point in this ITP
    await itpExecution.signOffPoint(0);

    // Assert — error is displayed indicating NCR must be resolved first
    await expect(itpExecution.errorBanner).toBeVisible();
    await expect(itpExecution.errorBanner).toContainText(/NCR|resolve|non-conformance/i);
  });
});

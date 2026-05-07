import { Page, Locator } from '@playwright/test';

export class ITPExecutionPage {
  readonly page: Page;
  readonly statusBadge: Locator;
  readonly pointCards: Locator;
  readonly submitForReviewButton: Locator;
  readonly approveITPButton: Locator;
  readonly rejectITPButton: Locator;
  readonly rejectReasonTextarea: Locator;
  readonly confirmRejectButton: Locator;
  readonly errorBanner: Locator;
  readonly itpName: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statusBadge = page.locator('.itp-header .status-badge');
    this.pointCards = page.locator('.point-card');
    this.submitForReviewButton = page.locator('.workflow-banner.draft button.btn-workflow');
    this.approveITPButton = page.locator('button.btn-workflow.approve');
    this.rejectITPButton = page.locator('button.btn-workflow.reject').first();
    this.rejectReasonTextarea = page.locator('.reject-form textarea');
    this.confirmRejectButton = page.locator('.reject-form button.btn-workflow.reject');
    this.errorBanner = page.locator('.error-banner');
    this.itpName = page.locator('.itp-header h1');
  }

  async goto(itpId: number | string) {
    await this.page.goto(`/itp/${itpId}`);
    // Wait for the ITP page to load (either shows header or error)
    await this.page.waitForSelector('.itp-header, .error-banner', { timeout: 15000 });
  }

  async getStatus(): Promise<string> {
    return (await this.statusBadge.textContent()) ?? '';
  }

  async signOffPoint(pointIndex: number) {
    const card = this.pointCards.nth(pointIndex);
    await card.locator('button.btn-approve').click();
  }

  async rejectPoint(pointIndex: number) {
    const card = this.pointCards.nth(pointIndex);
    await card.locator('button.btn-reject').click();
    // A rejection choice modal opens — choose "Raise NCR"
    const ncrForm = this.page.locator('.ncr-form');
    await ncrForm.waitFor({ state: 'visible', timeout: 5000 });
    await ncrForm.locator('button', { hasText: /Raise NCR/i }).first().click();
    // Fill NCR description and submit
    await ncrForm.locator('textarea').fill('Non-conformance found during E2E testing');
    await ncrForm.locator('button.btn-save').click();
  }

  async submitForReview() {
    await this.submitForReviewButton.click();
  }

  async approveITP() {
    await this.approveITPButton.click();
  }

  async rejectITP(reason?: string) {
    await this.rejectITPButton.click();
    if (reason) {
      await this.rejectReasonTextarea.fill(reason);
    }
    await this.confirmRejectButton.click();
  }
}

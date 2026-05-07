import { Page, Locator, expect } from '@playwright/test';

export class NCRDetailPage {
  readonly page: Page;
  readonly statusBadge: Locator;
  readonly resolveButton: Locator;
  readonly saveButton: Locator;
  readonly rootCauseTextarea: Locator;
  readonly correctiveActionTextarea: Locator;
  readonly dispositionTextarea: Locator;
  readonly auditTrail: Locator;
  readonly linkedITPLink: Locator;
  readonly errorBanner: Locator;
  readonly ncrRefBadge: Locator;
  readonly descriptionTextarea: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statusBadge = page.locator('.ncr-header-actions .status-badge');
    this.resolveButton = page.locator('.btn-resolve-large');
    this.saveButton = page.locator('.btn-save-ncr');
    this.rootCauseTextarea = page.locator('.ncr-section').filter({ hasText: 'Root Cause' }).locator('textarea');
    this.correctiveActionTextarea = page.locator('.ncr-section').filter({ hasText: 'Corrective / Preventative Action' }).locator('textarea');
    this.dispositionTextarea = page.locator('.ncr-section').filter({ hasText: 'Proposed Disposition' }).locator('textarea');
    this.auditTrail = page.locator('.ncr-audit-timeline .audit-entry');
    this.linkedITPLink = page.locator('.ncr-meta-grid a');
    this.errorBanner = page.locator('.error-banner');
    this.ncrRefBadge = page.locator('.ncr-ref-badge');
    this.descriptionTextarea = page.locator('.ncr-section').filter({ hasText: 'Description of Non-Conformance' }).locator('textarea');
  }

  async goto(ncrId: number | string) {
    await this.page.goto(`/ncrs/${ncrId}`);
    // Wait for the NCR detail page to finish loading
    await this.page.waitForSelector('.ncr-detail-header, .error-banner', { timeout: 15000 });
  }

  async updateFields(data: { rootCause?: string; correctiveAction?: string; disposition?: string }) {
    if (data.rootCause !== undefined) {
      await this.rootCauseTextarea.waitFor({ state: 'visible', timeout: 10000 });
      await this.rootCauseTextarea.fill(data.rootCause);
    }
    if (data.correctiveAction !== undefined) {
      await this.correctiveActionTextarea.waitFor({ state: 'visible', timeout: 10000 });
      await this.correctiveActionTextarea.fill(data.correctiveAction);
    }
    if (data.disposition !== undefined) {
      await this.dispositionTextarea.waitFor({ state: 'visible', timeout: 10000 });
      await this.dispositionTextarea.fill(data.disposition);
    }
    await this.saveButton.waitFor({ state: 'visible', timeout: 5000 });
    await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
    await this.saveButton.click();
  }

  async resolve() {
    await this.resolveButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.resolveButton.click();
  }

  async getStatus(): Promise<string> {
    return (await this.statusBadge.textContent()) ?? '';
  }
}

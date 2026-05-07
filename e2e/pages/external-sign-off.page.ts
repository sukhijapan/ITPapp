import { Page, Locator } from '@playwright/test';

export class ExternalSignOffPage {
  readonly page: Page;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly commentsInput: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly contextCard: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.approveButton = page.locator('button', { hasText: 'Approve' });
    this.rejectButton = page.locator('button', { hasText: 'Reject' });
    this.commentsInput = page.locator('textarea');
    this.errorMessage = page.locator('text=Sign-off Link Error').locator('..');
    this.successMessage = page.locator('h2', { hasText: /Approved|Rejected/ });
    this.contextCard = page.locator('text=Inspection Point').locator('..');
    this.heading = page.locator('h1', { hasText: 'Inspection Sign-off Required' });
  }

  async goto(token: string) {
    await this.page.goto(`/external-sign-off/${token}`);
    // Wait for the page to render — the component uses inline styles (no CSS classes)
    // so we wait for either the heading text or the error text to appear
    await this.page.waitForSelector('text=Inspection Sign-off Required, text=Sign-off Link Error, text=Loading', { timeout: 15000 });
    // If still showing "Loading...", wait for it to resolve
    await this.page.locator('text=Loading').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  async getPointContext(): Promise<string> {
    return (await this.contextCard.textContent()) ?? '';
  }

  async submitApproval(comments?: string) {
    if (comments) {
      await this.commentsInput.fill(comments);
    }
    await this.approveButton.click();
  }

  async submitRejection(comments?: string) {
    if (comments) {
      await this.commentsInput.fill(comments);
    }
    await this.rejectButton.click();
  }

  async getErrorMessage(): Promise<string> {
    const errorContainer = this.page.locator('text=Sign-off Link Error').locator('..');
    if (await errorContainer.isVisible()) {
      return (await errorContainer.locator('p').textContent()) ?? '';
    }
    return '';
  }
}

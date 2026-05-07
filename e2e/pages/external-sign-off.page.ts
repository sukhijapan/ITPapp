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
    
    // Wait for either the content, an error, or the loading indicator to appear
    const heading = this.page.getByRole('heading', { name: 'Inspection Sign-off Required' });
    const error = this.page.getByText('Sign-off Link Error');
    const loading = this.page.getByText('Loading...');

    await Promise.race([
      heading.waitFor({ state: 'visible', timeout: 15000 }),
      error.waitFor({ state: 'visible', timeout: 15000 }),
      loading.waitFor({ state: 'visible', timeout: 15000 })
    ]).catch(() => {
      throw new Error(`Timed out waiting for external sign-off page to load for token: ${token}`);
    });

    // If still showing "Loading...", wait for it to resolve
    if (await loading.isVisible()) {
      await loading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    }
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

import { Page, Locator } from '@playwright/test';

export class ResetPasswordPage {
  readonly page: Page;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly invalidMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.error');
    this.successMessage = page.locator('h1', { hasText: 'Password Reset Successful' });
    this.invalidMessage = page.locator('h1', { hasText: 'Invalid or Expired Link' });
  }

  async goto(token: string) {
    await this.page.goto(`/reset-password/${token}`);
    
    // Wait for either the form or an error message
    const heading = this.page.getByRole('heading', { name: /Set New Password|Invalid or Expired Link/ });
    const verifying = this.page.getByText('Verifying...');

    await Promise.race([
      heading.waitFor({ state: 'visible', timeout: 15000 }),
      verifying.waitFor({ state: 'visible', timeout: 15000 })
    ]).catch(() => {});

    // If still showing "Verifying...", wait for it to resolve
    if (await verifying.isVisible()) {
      await verifying.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    }
  }

  async resetPassword(password: string) {
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

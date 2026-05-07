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
    // Wait for the page to fully load — either the password form or an error/invalid message
    await this.page.waitForSelector('input[type="password"], h1:has-text("Invalid"), h1:has-text("Expired"), h1:has-text("Successful")', { timeout: 30000 });
  }

  async resetPassword(password: string) {
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

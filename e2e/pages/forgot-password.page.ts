import { Page, Locator } from '@playwright/test';

export class ForgotPasswordPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.successMessage = page.locator('h1', { hasText: 'Check Your Email' });
    this.errorMessage = page.locator('.error');
  }

  async goto() {
    await this.page.goto('/forgot-password');
  }

  async submitEmail(email: string) {
    await this.emailInput.fill(email);
    const responsePromise = this.page.waitForResponse(
      (r) => r.url().includes('/auth/forgot-password') && r.request().method() === 'POST',
      { timeout: 15000 }
    );
    await this.submitButton.click();
    await responsePromise.catch(() => {});
  }
}

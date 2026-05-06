import { Page, Locator } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.error');
    this.successMessage = page.locator('h1', { hasText: 'Complete Registration' });
    this.fullNameInput = page.locator('input[aria-label="Full name"]');
    this.emailInput = page.locator('input[aria-label="Email address"]');
  }

  async goto(token: string) {
    await this.page.goto(`/register/${token}`);
  }

  async register(password: string) {
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

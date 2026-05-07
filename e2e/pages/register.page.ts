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
    this.errorMessage = page.locator('.error, h1:has-text("Invalid Link"), h1:has-text("Invitation Expired")');
    this.successMessage = page.locator('h1', { hasText: 'Complete Registration' });
    this.fullNameInput = page.locator('input[aria-label="Full name"]');
    this.emailInput = page.locator('input[aria-label="Email address"]');
  }

  async goto(token: string) {
    await this.page.goto(`/register/${token}`);
    // Wait for the page to fully load — either the registration form or an error message
    await this.page.waitForSelector('input[type="password"], h1:has-text("Invalid"), h1:has-text("Expired")', { timeout: 30000 });
  }

  async register(password: string) {
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

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

    // Wait for the page to leave the loading state ("Setting up your account...")
    // and resolve to a final heading (valid form, expired, or invalid)
    const finalHeading = this.page.getByRole('heading', {
      name: /Complete Registration|Invalid Link|Invitation Expired/,
    });
    await finalHeading.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  }

  async register(password: string) {
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

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
    
    // Wait for either the form, an error, or the loading state
    const heading = this.page.getByRole('heading', { name: /Complete Registration|Invalid Link|Invitation Expired/ });
    const loading = this.page.getByText('Loading…'); // Note: uses ellipsis character …

    await Promise.race([
      heading.waitFor({ state: 'visible', timeout: 15000 }),
      loading.waitFor({ state: 'visible', timeout: 15000 })
    ]).catch(() => {});

    // If still showing "Loading…", wait for it to resolve
    if (await loading.isVisible()) {
      await loading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    }
  }

  async register(password: string) {
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

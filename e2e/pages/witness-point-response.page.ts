import { Page, Locator } from '@playwright/test';

export class WitnessPointResponsePage {
  readonly page: Page;
  readonly confirmButton: Locator;
  readonly declineButton: Locator;
  readonly rescheduleButton: Locator;
  readonly submitButton: Locator;
  readonly reasonTextarea: Locator;
  readonly rescheduleTimeInput: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly notificationContext: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.confirmButton = page.locator('button', { hasText: 'Confirm Attendance' });
    this.declineButton = page.locator('button', { hasText: 'Decline' });
    this.rescheduleButton = page.locator('button', { hasText: 'Request Reschedule' });
    this.submitButton = page.locator('button[type="submit"]', { hasText: 'Submit Response' });
    this.reasonTextarea = page.locator('textarea');
    this.rescheduleTimeInput = page.locator('input[type="datetime-local"]');
    this.errorMessage = page.locator('text=Response Link Error').locator('..');
    this.successMessage = page.locator('h2');
    this.notificationContext = page.locator('.bg-blue-50');
    this.heading = page.locator('h1', { hasText: 'Witness Point Inspection Notification' });
  }

  async goto(token: string) {
    await this.page.goto(`/wp-response/${token}`);
  }

  async getNotificationContext(): Promise<string> {
    return (await this.notificationContext.textContent()) ?? '';
  }

  async confirm() {
    await this.confirmButton.click();
    await this.submitButton.click();
  }

  async decline(reason: string) {
    await this.declineButton.click();
    await this.reasonTextarea.fill(reason);
    await this.submitButton.click();
  }

  async reschedule(newTime: string) {
    await this.rescheduleButton.click();
    await this.rescheduleTimeInput.fill(newTime);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string> {
    const errorContainer = this.page.locator('text=Response Link Error').locator('..');
    if (await errorContainer.isVisible()) {
      return (await errorContainer.locator('p').textContent()) ?? '';
    }
    return '';
  }
}

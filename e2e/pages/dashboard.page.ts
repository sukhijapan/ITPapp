import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly welcomeHeading: Locator;
  readonly logoutButton: Locator;
  readonly userManagementLink: Locator;
  readonly projectCards: Locator;
  readonly statCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeHeading = page.locator('.dashboard header h1');
    this.logoutButton = page.locator('button', { hasText: 'Logout' });
    this.userManagementLink = page.locator('a[href="/admin/users"]');
    this.projectCards = page.locator('.project-card');
    this.statCards = page.locator('.stat-card');
  }

  async goto() {
    await this.page.goto('/');
  }

  async getWelcomeText(): Promise<string> {
    return (await this.welcomeHeading.textContent()) ?? '';
  }

  async clickProject(name: string) {
    await this.page.locator('.project-card', { hasText: name }).click();
  }

  async isUserManagementVisible(): Promise<boolean> {
    return this.userManagementLink.isVisible();
  }
}

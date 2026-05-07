import { Page, Locator } from '@playwright/test';

export class ProjectDetailsPage {
  readonly page: Page;
  readonly projectNameHeading: Locator;
  readonly itpInstancesList: Locator;
  readonly templateSection: Locator;
  readonly createTemplateLink: Locator;
  readonly browseLibraryLink: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.projectNameHeading = page.locator('.project-details h1');
    this.itpInstancesList = page.locator('.section').filter({ hasText: 'Active ITPs' }).locator('.list-item');
    this.templateSection = page.locator('.section').filter({ hasText: 'ITP Templates' });
    this.createTemplateLink = page.locator('a', { hasText: 'Create Template' });
    this.browseLibraryLink = page.locator('a', { hasText: 'Browse Library' });
    this.errorBanner = page.locator('.error-banner');
  }

  async goto(projectId: number | string) {
    await this.page.goto(`/projects/${projectId}`);
  }

  async clickCreateITP(templateName: string) {
    const templateRow = this.templateSection.locator('.list-item', { hasText: templateName });
    await templateRow.locator('button', { hasText: 'Create Instance' }).click();
    // Modal opens — fill instance name and submit
    const modal = this.page.locator('.modal-box');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.fill(`E2E Instance ${Date.now()}`);
    await modal.locator('button[type="submit"]').click();
    // Wait for navigation to the ITP execution page and for content to render
    await this.page.waitForURL('**/itp/**', { timeout: 15000 });
    await this.page.waitForSelector('.itp-header, .error-banner', { timeout: 15000 });
  }

  async getITPInstances(): Promise<string[]> {
    const items = this.itpInstancesList;
    const count = await items.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (text) names.push(text.trim());
    }
    return names;
  }
}

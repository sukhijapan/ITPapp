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

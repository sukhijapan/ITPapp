import { Page, Locator } from '@playwright/test';

export class TemplateBuilderPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly addPointButton: Locator;
  readonly saveButton: Locator;
  readonly errorBanner: Locator;
  readonly pointRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.locator('.template-meta input[type="text"]');
    this.descriptionInput = page.locator('.template-meta textarea');
    this.addPointButton = page.locator('.btn-add');
    this.saveButton = page.locator('.btn-save');
    this.errorBanner = page.locator('.error-banner');
    this.pointRows = page.locator('.point-item-container');
  }

  async goto(projectId: number | string) {
    await this.page.goto(`/projects/${projectId}/templates/new`);
  }

  async fillTemplate(name: string, description: string) {
    await this.nameInput.fill(name);
    await this.descriptionInput.fill(description);
  }

  async addPoint(type: string, description: string, criteria: string) {
    await this.addPointButton.click();
    const lastPoint = this.pointRows.last();
    await lastPoint.locator('.col-desc input').fill(description);
    await lastPoint.locator('.col-type select').selectOption(type);
    await lastPoint.locator('.detail-field').filter({ hasText: 'Acceptance Criteria' }).locator('input').fill(criteria);
  }

  async submit() {
    await this.saveButton.click();
  }
}

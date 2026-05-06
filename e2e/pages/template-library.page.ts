import { Page, Locator } from '@playwright/test';

export class TemplateLibraryPage {
  readonly page: Page;
  readonly templateCards: Locator;
  readonly tradeFilters: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.templateCards = page.locator('.library-card');
    this.tradeFilters = page.locator('.trade-filters .filter-pill');
    this.searchInput = page.locator('.search-box input');
  }

  async goto(projectId: number | string) {
    await this.page.goto(`/projects/${projectId}/templates/library`);
  }

  async cloneTemplate(templateName: string) {
    const card = this.templateCards.filter({ hasText: templateName });
    await card.locator('.btn-clone').click();
  }

  async filterByTrade(trade: string) {
    await this.tradeFilters.filter({ hasText: trade }).click();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
  }
}

import { Page, Locator } from '@playwright/test';

export class NCRListPage {
  readonly page: Page;
  readonly ncrRows: Locator;
  readonly statusBadges: Locator;
  readonly filterButtons: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.ncrRows = page.locator('.ncr-table tbody tr');
    this.statusBadges = page.locator('.ncr-table .status-badge');
    this.filterButtons = page.locator('.ncr-filters .filter-btn');
    this.heading = page.locator('.ncr-list-header h1');
    this.subtitle = page.locator('.ncr-list-header .subtitle');
  }

  async goto() {
    await this.page.goto('/ncrs');
  }

  async getNCRCount(): Promise<number> {
    return this.ncrRows.count();
  }

  async clickNCR(ncrId: number) {
    const paddedId = String(ncrId).padStart(4, '0');
    await this.page.locator(`a.ncr-id-link`, { hasText: `NCR-${paddedId}` }).click();
  }

  async filterByStatus(status: string) {
    await this.filterButtons.filter({ hasText: status }).click();
  }
}

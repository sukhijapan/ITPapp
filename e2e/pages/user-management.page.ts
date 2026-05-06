import { Page, Locator } from '@playwright/test';

export class UserManagementPage {
  readonly page: Page;
  readonly userTable: Locator;
  readonly userRows: Locator;
  readonly inviteButton: Locator;
  readonly heading: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly pendingInvitationsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userTable = page.locator('.users-section .data-table');
    this.userRows = page.locator('.users-section .data-table tbody tr');
    this.inviteButton = page.locator('button', { hasText: 'Invite User' });
    this.heading = page.locator('h1', { hasText: 'User Management' });
    this.successMessage = page.locator('.success');
    this.errorMessage = page.locator('.error');
    this.pendingInvitationsTable = page.locator('.invitations-section .data-table');
  }

  async goto() {
    await this.page.goto('/admin/users');
  }

  async inviteUser(email: string, role: string, fullName: string = 'Test User') {
    await this.inviteButton.click();
    const modal = this.page.locator('.modal-overlay');
    await modal.locator('input[type="email"]').fill(email);
    await modal.locator('input[type="text"]').first().fill(fullName);
    await modal.locator('select').selectOption({ label: role });
    await modal.locator('button[type="submit"]').click();
  }

  async deactivateUser(email: string) {
    const row = this.userRows.filter({ hasText: email });
    await row.locator('button[aria-label="User actions"]').click();
    await this.page.locator('.dropdown-menu button', { hasText: 'Edit User' }).click();
    const modal = this.page.locator('.modal-overlay');
    await modal.locator('select').last().selectOption('inactive');
    await modal.locator('button[type="submit"]').click();
  }

  async activateUser(email: string) {
    const row = this.userRows.filter({ hasText: email });
    await row.locator('button[aria-label="User actions"]').click();
    await this.page.locator('.dropdown-menu button', { hasText: 'Edit User' }).click();
    const modal = this.page.locator('.modal-overlay');
    await modal.locator('select').last().selectOption('active');
    await modal.locator('button[type="submit"]').click();
  }

  async getUserStatus(email: string): Promise<string> {
    const row = this.userRows.filter({ hasText: email });
    const badge = row.locator('.status-badge');
    return (await badge.textContent()) ?? '';
  }
}

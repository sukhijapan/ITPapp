import { test as base, BrowserContext } from '@playwright/test';
import path from 'path';

type AuthFixtures = {
  subcontractorContext: BrowserContext;
  headContractorContext: BrowserContext;
  clientContext: BrowserContext;
  adminContext: BrowserContext;
};

export const test = base.extend<AuthFixtures>({
  subcontractorContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(process.cwd(), '.playwright', '.auth', 'subcontractor.json'),
    });
    await use(context);
    await context.close();
  },
  headContractorContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(process.cwd(), '.playwright', '.auth', 'headContractor.json'),
    });
    await use(context);
    await context.close();
  },
  clientContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(process.cwd(), '.playwright', '.auth', 'client.json'),
    });
    await use(context);
    await context.close();
  },
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(process.cwd(), '.playwright', '.auth', 'admin.json'),
    });
    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';

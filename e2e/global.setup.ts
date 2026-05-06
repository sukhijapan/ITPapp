import { test as setup } from '@playwright/test';
import { seedTestData } from './helpers/seed';
import { setupAuthState } from './helpers/auth.helper';

setup('seed database and create auth states', async () => {
  // 1. Seed deterministic test data
  await seedTestData();

  // 2. Create auth state files for each role
  await setupAuthState('subcontractor');
  await setupAuthState('headContractor');
  await setupAuthState('client');
  await setupAuthState('admin');
});

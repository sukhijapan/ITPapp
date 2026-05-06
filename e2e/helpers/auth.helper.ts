import { request } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { TEST_USERS } from '../test-data/constants';

const AUTH_DIR = path.join(process.cwd(), '.playwright', '.auth');

export type UserRole = 'subcontractor' | 'headContractor' | 'client' | 'admin';

export async function authenticateRole(role: UserRole): Promise<string> {
  const user = TEST_USERS[role];
  const context = await request.newContext({
    baseURL: 'http://localhost:3000',
  });

  const response = await context.post('/api/auth/login', {
    data: { email: user.email, password: user.password },
  });

  const body = await response.json();
  await context.dispose();
  return body.token;
}

export async function setupAuthState(role: UserRole): Promise<string> {
  const storageFile = path.join(AUTH_DIR, `${role}.json`);
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const token = await authenticateRole(role);

  // Store as Playwright storage state format
  const storageState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:5173',
        localStorage: [
          { name: 'token', value: token },
          { name: 'user', value: JSON.stringify(TEST_USERS[role]) },
        ],
      },
    ],
  };

  fs.writeFileSync(storageFile, JSON.stringify(storageState, null, 2));
  return storageFile;
}

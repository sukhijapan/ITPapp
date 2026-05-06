import { request } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { TEST_USERS } from '../test-data/constants';

const AUTH_DIR = path.join(process.cwd(), '.playwright', '.auth');

export type UserRole = 'subcontractor' | 'headContractor' | 'client' | 'admin';

interface LoginResponse {
  token: string;
  user: { id: number; full_name: string; email: string; role_id: number };
}

export async function authenticateRole(role: UserRole): Promise<LoginResponse> {
  const user = TEST_USERS[role];
  const context = await request.newContext({
    baseURL: 'http://localhost:3000',
  });

  const response = await context.post('/api/auth/login', {
    data: { email: user.email, password: user.password },
  });

  const body = await response.json();
  await context.dispose();
  return body as LoginResponse;
}

export async function setupAuthState(role: UserRole): Promise<string> {
  const storageFile = path.join(AUTH_DIR, `${role}.json`);
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const { token, user } = await authenticateRole(role);

  // Store as Playwright storage state format — user object must match
  // the shape expected by AuthContext: { id, full_name, email, role_id }
  const storageState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:5173',
        localStorage: [
          { name: 'token', value: token },
          { name: 'user', value: JSON.stringify(user) },
        ],
      },
    ],
  };

  fs.writeFileSync(storageFile, JSON.stringify(storageState, null, 2));
  return storageFile;
}

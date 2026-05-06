# E2E Testing Framework

End-to-end tests for the Construction Quality Management App using [Playwright](https://playwright.dev/).

## Test-First Workflow

This project follows a **test-first approach** for new features:

1. **Write a failing E2E test** based on the spec's acceptance criteria
2. **Run the test** to confirm it fails (red phase)
3. **Implement the feature** until the test passes (green phase)
4. **Refactor** if needed while keeping tests green

Use the template at `e2e/templates/feature-test.template.ts` to start new feature tests quickly.

## Running Tests Locally

### Prerequisites

- PostgreSQL running with the dev database seeded
- Backend and frontend servers (Playwright starts them automatically via `webServer` config)

### Commands

```bash
# Run all tests (Playwright starts backend + frontend automatically)
npm run test:e2e

# Run in headed mode (see the browser)
npm run test:e2e:headed

# Run with Playwright UI (interactive debugging)
npm run test:e2e:ui

# Run only smoke tests
npm run test:e2e:smoke

# Run only critical tests
npm run test:e2e:critical

# Run only chromium (faster local iteration)
npm run test:e2e:chromium

# Run tests matching a specific file or pattern
npx playwright test tests/auth/login.spec.ts

# Run tests by tag
npx playwright test --grep @regression
```

### Debugging

```bash
# Run with trace viewer
npx playwright test --trace on

# Run a single test in debug mode (step through)
npx playwright test --debug tests/auth/login.spec.ts
```

## Project Structure

```
e2e/
├── fixtures/           # Playwright test fixtures (auth contexts per role)
│   └── auth.fixture.ts
├── helpers/            # Shared utilities
│   ├── auth.helper.ts  # API-based login, token storage
│   └── seed.ts         # Database seeding with upsert logic
├── pages/              # Page Object Model classes
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   └── ...
├── test-data/          # Constants for seeded test data
│   └── constants.ts
├── templates/          # Copy-paste templates for new tests
│   └── feature-test.template.ts
├── tests/              # Test specs organized by feature area
│   ├── auth/
│   ├── projects/
│   ├── itps/
│   ├── ncrs/
│   ├── witness-points/
│   ├── external-sign-off/
│   ├── media/
│   ├── users/
│   └── rbac/
└── global.setup.ts     # Seeds DB and creates auth state files
```

## Adding New Tests

### 1. Create a Page Object (if needed)

Add a new file in `e2e/pages/`:

```typescript
import { Page, Locator } from '@playwright/test';

export class MyFeaturePage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto('/my-feature');
  }
}
```

### 2. Create the Test Spec

Copy the template and fill in your tests:

```bash
cp e2e/templates/feature-test.template.ts e2e/tests/{feature-area}/{feature}.spec.ts
```

### 3. Use Auth Fixtures for Role-Based Tests

```typescript
import { test, expect } from '../../fixtures/auth.fixture';

test('admin can access settings', async ({ adminContext }) => {
  const page = await adminContext.newPage();
  await page.goto('/admin/settings');
  await expect(page.locator('h1')).toContainText('Settings');
});
```

### 4. Use Page Objects for Clean Interactions

```typescript
import { LoginPage } from '../../pages/login.page';

test('valid login redirects to dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');
  await expect(page).toHaveURL('/');
});
```

## Test Tagging Conventions

Tests are tagged for selective execution:

| Tag | Purpose | When to Use |
|-----|---------|-------------|
| `@smoke` | Quick sanity checks | Core happy paths that must always work |
| `@critical` | Business-critical flows | Auth, ITP execution, RBAC enforcement |
| `@regression` | Full regression coverage | All other feature tests |

Apply tags by appending them to the test name:

```typescript
test('should login successfully @smoke @critical', async ({ page }) => {
  // ...
});
```

Run by tag:

```bash
npx playwright test --grep @smoke
npx playwright test --grep @critical
npx playwright test --grep "@smoke|@critical"
```

## Adding New Fixtures

Extend the auth fixture in `e2e/fixtures/auth.fixture.ts` or create a new fixture file:

```typescript
import { test as base } from '@playwright/test';

type MyFixtures = {
  myHelper: MyHelper;
};

export const test = base.extend<MyFixtures>({
  myHelper: async ({}, use) => {
    const helper = new MyHelper();
    await use(helper);
  },
});
```

## CI Integration

Tests run automatically on pull requests to `main` via GitHub Actions (`.github/workflows/e2e.yml`). The CI workflow:

- Provisions a PostgreSQL 16 service container
- Runs database migrations
- Installs only Chromium (for speed)
- Runs tests with 2 workers and 15-minute timeout
- Uploads screenshots, traces, and HTML report as artifacts on failure

## Test Data

Seeded test data uses high IDs (9000+) and `@test.local` emails to avoid collision with real development data. See `e2e/test-data/constants.ts` for all available test users, projects, and templates.

| Role | Email |
|------|-------|
| Subcontractor | `e2e-subcontractor@test.local` |
| Head Contractor | `e2e-headcontractor@test.local` |
| Client | `e2e-client@test.local` |
| Admin | `e2e-admin@test.local` |

All test users share the password: `TestPass123!`

# Implementation Plan: E2E Testing Framework

## Overview

Set up a Playwright-based end-to-end testing framework at the project root. The framework uses the Page Object Model, API-based authentication fixtures, and upsert-based database seeding against the existing development database. Tests cover all feature areas (auth, projects, ITPs, NCRs, witness points, external sign-off, media, users, RBAC) and integrate into CI via GitHub Actions.

## Tasks

- [x] 1. Install Playwright and set up project root configuration
  - [x] 1.1 Create root `package.json` with e2e scripts and install Playwright as a dev dependency
    - Initialize `package.json` at project root with `name`, `private: true`, and scripts: `test:e2e`, `test:e2e:headed`, `test:e2e:ui`, `test:e2e:smoke`, `test:e2e:critical`, `test:e2e:chromium`
    - Install `@playwright/test` and `pg` and `bcryptjs` as dev dependencies
    - Install `@types/pg` and `@types/bcryptjs` and `typescript` as dev dependencies
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Create `playwright.config.ts` at project root
    - Define `testDir: './e2e/tests'`, `fullyParallel: true`, `forbidOnly` in CI, retries (2 in CI, 0 locally)
    - Configure `baseURL: 'http://localhost:5173'`, trace on first retry, screenshot on failure, video retain on failure
    - Define projects: `setup` (global.setup.ts), `chromium`, `firefox`, `webkit` with setup dependency
    - Configure `webServer` array: backend on port 3000 (`npm run start` in `./backend`), frontend on port 5173 (`npm run dev` in `./frontend`), both with `reuseExistingServer: !process.env.CI`
    - Set `outputDir: '.playwright/results'` and HTML reporter to `.playwright/report`
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.3 Create `tsconfig.json` for the e2e directory
    - Configure TypeScript for the e2e tests (target ES2020, module NodeNext, strict mode)
    - _Requirements: 1.1_

  - [x] 1.4 Update `.gitignore` to exclude `.playwright/` directory and auth state files
    - Add `.playwright/` and `e2e/.auth/` entries
    - _Requirements: 1.4_

- [x] 2. Create directory structure and test data constants
  - [x] 2.1 Create `e2e/test-data/constants.ts` with all seeded test data
    - Define `TEST_USERS` object with credentials for subcontractor, headContractor, client, admin roles (using `@test.local` emails)
    - Define `DEACTIVATED_USER` with known credentials
    - Define `TEST_PROJECT` (id: 9000, name, description)
    - Define `TEST_TEMPLATE` (id: 9000, name, projectId)
    - Define `TEST_ITP_INSTANCES` with IDs for each status (Draft: 9001, Pending Review: 9002, Open: 9003, Closed: 9004)
    - Define `TEST_NCRS` with IDs for open (9001) and closed (9002) NCRs
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 2.2 Create `e2e/helpers/seed.ts` — database seed script with upsert logic
    - Connect to PostgreSQL using env vars (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT) with sensible defaults
    - Upsert 4 test users (one per role) + 1 deactivated user using `INSERT ... ON CONFLICT (email) DO UPDATE`
    - Upsert test project (id: 9000)
    - Upsert ITP template (id: 9000) with 5 template points (HP, WP, RP, SP, IP)
    - Upsert 4 ITP instances (Draft, Pending Review, Open, Closed) with copied points
    - Upsert 1 open NCR and 1 closed NCR linked to ITP points
    - Ensure idempotency — multiple runs produce the same state
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3. Create authentication helper and fixtures
  - [x] 3.1 Create `e2e/helpers/auth.helper.ts`
    - Implement `authenticateRole(role)` function that POSTs to `/api/auth/login` with seeded credentials and returns JWT token
    - Implement `setupAuthState(role)` function that creates Playwright storage state JSON files in `.playwright/.auth/`
    - Storage state format: `{ cookies: [], origins: [{ origin, localStorage: [{ name: 'token', value }, { name: 'user', value }] }] }`
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 3.2 Create `e2e/fixtures/auth.fixture.ts`
    - Extend Playwright `test` with custom fixtures: `subcontractorContext`, `headContractorContext`, `clientContext`, `adminContext`
    - Each fixture creates a `BrowserContext` with the corresponding role's stored auth state
    - Export extended `test` and `expect` for use in test specs
    - _Requirements: 3.2, 3.3_

  - [x] 3.3 Create `e2e/global.setup.ts` — global setup that seeds DB and creates auth states
    - Call `seedTestData()` to ensure test data exists
    - Call `setupAuthState()` for each of the 4 roles
    - Register as a Playwright setup project
    - _Requirements: 2.1, 3.4, 3.5_

- [x] 4. Checkpoint — Verify infrastructure works
  - Ensure Playwright installs and the global setup (seed + auth) runs successfully against the dev database. Ask the user if questions arise.

- [x] 5. Create Page Objects for all pages
  - [x] 5.1 Create `e2e/pages/login.page.ts`
    - Locators: email input, password input, submit button, error message, forgot password link
    - Methods: `goto()`, `login(email, password)`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.2 Create `e2e/pages/register.page.ts`
    - Locators: password input, confirm password input, submit button, error message, success message
    - Methods: `goto(token)`, `register(password, confirmPassword)`
    - _Requirements: 4.4, 4.5_

  - [x] 5.3 Create `e2e/pages/forgot-password.page.ts`
    - Locators: email input, submit button, success message
    - Methods: `goto()`, `submitEmail(email)`
    - _Requirements: 4.6_

  - [x] 5.4 Create `e2e/pages/reset-password.page.ts`
    - Locators: password input, confirm password input, submit button, error message, success message
    - Methods: `goto(token)`, `resetPassword(password, confirmPassword)`
    - _Requirements: 4.7_

  - [x] 5.5 Create `e2e/pages/dashboard.page.ts`
    - Locators: welcome heading, logout button, user management link, project cards, stat cards
    - Methods: `goto()`, `getWelcomeText()`, `clickProject(name)`, `isUserManagementVisible()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.6 Create `e2e/pages/project-details.page.ts`
    - Locators: project name heading, ITP instances list, template management section, create ITP button
    - Methods: `goto(projectId)`, `clickCreateITP()`, `getITPInstances()`
    - _Requirements: 5.2, 8.1_

  - [x] 5.7 Create `e2e/pages/template-builder.page.ts`
    - Locators: name input, description input, add point button, point type selects, submit button, error message
    - Methods: `goto(projectId)`, `fillTemplate(name, description)`, `addPoint(type, description, criteria)`, `submit()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.8 Create `e2e/pages/template-library.page.ts`
    - Locators: template cards, trade category filters, clone button, publish button
    - Methods: `goto(projectId)`, `cloneTemplate(templateName)`, `publishTemplate(templateName, category)`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 5.9 Create `e2e/pages/itp-execution.page.ts`
    - Locators: ITP status badge, point rows, sign-off buttons, submit for review button, approve/reject buttons, comments input
    - Methods: `goto(itpId)`, `getStatus()`, `signOffPoint(pointIndex)`, `submitForReview()`, `approveITP()`, `rejectITP(reason)`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 5.10 Create `e2e/pages/ncr-list.page.ts`
    - Locators: NCR rows, status badges, project context, create NCR button
    - Methods: `goto()`, `getNCRCount()`, `clickNCR(ncrId)`
    - _Requirements: 9.2_

  - [x] 5.11 Create `e2e/pages/ncr-detail.page.ts`
    - Locators: NCR fields (root cause, corrective action, disposition), status badge, resolve button, audit trail, linked ITP info
    - Methods: `goto(ncrId)`, `updateFields(data)`, `resolve()`, `getStatus()`
    - _Requirements: 9.3, 9.4, 9.5_

  - [x] 5.12 Create `e2e/pages/user-management.page.ts`
    - Locators: user list table, invite button, role selects, activate/deactivate buttons, invite modal
    - Methods: `goto()`, `inviteUser(email, role)`, `deactivateUser(email)`, `activateUser(email)`, `getUserStatus(email)`
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 5.13 Create `e2e/pages/external-sign-off.page.ts`
    - Locators: ITP point context display, approve button, signer name input, error message
    - Methods: `goto(token)`, `getPointContext()`, `submitApproval(signerName)`, `getErrorMessage()`
    - _Requirements: 11.2, 11.3, 11.4_

  - [x] 5.14 Create `e2e/pages/witness-point-response.page.ts`
    - Locators: notification context display, confirm button, decline button, reschedule button, error message
    - Methods: `goto(token)`, `getNotificationContext()`, `confirm()`, `decline()`, `reschedule(newTime)`, `getErrorMessage()`
    - _Requirements: 10.4, 10.5_

- [x] 6. Checkpoint — Verify page objects compile
  - Ensure all page objects compile without TypeScript errors. Ask the user if questions arise.

- [x] 7. Write auth test specs
  - [x] 7.1 Create `e2e/tests/auth/login.spec.ts`
    - Test: valid login redirects to dashboard and shows welcome message with user's name (@smoke @critical)
    - Test: invalid credentials show error message and user stays on login page
    - Test: deactivated user sees generic error (no information leakage)
    - Use `LoginPage` and `DashboardPage` page objects
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.2 Create `e2e/tests/auth/registration.spec.ts`
    - Test: valid invitation token allows registration and redirects to dashboard
    - Test: expired/invalid token shows error message
    - Approach: seed creates an invitation token in DB; test navigates directly to `/register/{token}`
    - Use `RegisterPage` page object
    - _Requirements: 4.4, 4.5_

  - [x] 7.3 Create `e2e/tests/auth/password-reset.spec.ts`
    - Test: forgot password form shows generic success message regardless of email existence
    - Test: valid reset token allows password change
    - Approach: test calls forgot-password API, then queries DB for the reset token, navigates to `/reset-password/{token}`
    - Use `ForgotPasswordPage` and `ResetPasswordPage` page objects
    - _Requirements: 4.6, 4.7_

- [x] 8. Write project management test specs
  - [x] 8.1 Create `e2e/tests/projects/dashboard.spec.ts`
    - Test: authenticated user sees project cards and statistics (Open ITPs, Blocking HPs, Open NCRs, Pending Review, Closed ITPs) (@smoke)
    - Test: clicking project card navigates to project details with ITP instances and template options
    - Test: Admin user sees User Management link
    - Test: non-Admin user does NOT see User Management link
    - Use `DashboardPage` and `ProjectDetailsPage` page objects with auth fixtures
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Write ITP template and execution test specs
  - [x] 9.1 Create `e2e/tests/itps/template-builder.spec.ts`
    - Test: create template with points of each type (HP, WP, RP, SP, IP) and verify it appears in project template list
    - Test: duplicate template name in same project shows conflict error
    - Test: delete template removes it and related data
    - Use `TemplateBuilderPage` page object with headContractor auth fixture
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 9.2 Create `e2e/tests/itps/template-library.spec.ts`
    - Test: library page shows public templates grouped by trade category
    - Test: cloning a library template creates a copy in the target project
    - Test: publishing a project template makes it visible in the global library
    - Use `TemplateLibraryPage` page object
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 9.3 Create `e2e/tests/itps/itp-execution.spec.ts` (@critical)
    - Test: create ITP instance from template — status is Draft with all points copied
    - Test: Subcontractor submits Draft ITP — status changes to Pending Review
    - Test: Head Contractor approves Pending Review ITP — status changes to Open
    - Test: Head Contractor rejects Pending Review ITP — status returns to Draft with rejection reason
    - Test: authorized user signs off point — status updates and signer info recorded
    - Test: signing off point blocked by preceding unsigned HP shows blocking error
    - Test: all points signed off — ITP status auto-changes to Closed
    - Test: wrong role attempting sign-off on role-restricted point shows permission error
    - Use `ITPExecutionPage` and `ProjectDetailsPage` page objects with multiple auth fixtures
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 10. Write NCR management test specs
  - [x] 10.1 Create `e2e/tests/ncrs/ncr-lifecycle.spec.ts`
    - Test: rejecting an inspection point creates an NCR with Open status and point becomes Rejected
    - Test: NCR list page shows NCRs with project context, status, and creation date
    - Test: NCR detail page shows all fields, audit trail, and linked ITP point info
    - Test: updating NCR fields (root cause, corrective action, disposition) persists changes
    - Test: resolving an NCR changes status to Closed
    - Test: point with open NCR cannot be approved until NCR is resolved
    - Use `NCRListPage`, `NCRDetailPage`, and `ITPExecutionPage` page objects
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 11. Write witness point notification test specs
  - [x] 11.1 Create `e2e/tests/witness-points/wp-notifications.spec.ts`
    - Test: Subcontractor raises WP notification with planned time and recipients — status is Pending
    - Test: internal recipient responds (confirm/decline/reschedule) — response recorded and status updates
    - Test: creator cancels pending notification — status changes to Cancelled
    - Test: external recipient accesses response page via valid token URL — context displayed and response submittable
    - Test: expired/used token shows error message
    - Test: non-Subcontractor/non-Head-Contractor user attempting to raise notification gets permission error
    - Approach: for token-based tests, seed creates notification with token in DB, test navigates to `/wp-response/{token}`
    - Use `WitnessPointResponsePage` page object and auth fixtures
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 12. Write external sign-off test specs
  - [x] 12.1 Create `e2e/tests/external-sign-off/external-sign-off.spec.ts`
    - Test: internal user requests external sign-off — token generated and request recorded
    - Test: external party accesses sign-off page via valid token — ITP point context displayed
    - Test: external party submits approval — point status updates to Approved with external signer details
    - Test: expired/used token shows error message
    - Approach: seed creates external sign-off request with token in DB, test navigates to `/external-sign-off/{token}`
    - Use `ExternalSignOffPage` page object
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 13. Write media upload test specs
  - [x] 13.1 Create `e2e/tests/media/media-upload.spec.ts`
    - Test: uploading a file to an inspection point creates a media record associated with the correct point
    - Test: uploading with GPS coordinates stores latitude and longitude
    - Test: deleting attachment from unsigned point removes the media
    - Test: deleting attachment from signed-off point shows permission error
    - Use `ITPExecutionPage` page object with file upload helpers
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 14. Write user management and RBAC test specs
  - [x] 14.1 Create `e2e/tests/users/user-management.spec.ts`
    - Test: Admin sees user list with roles and status
    - Test: Admin sends invitation — invitation created and registration link functional (verify token in DB, navigate to `/register/{token}`)
    - Test: Admin deactivates user — status changes to inactive
    - Test: Admin activates previously deactivated user — status changes to active
    - Test: non-Admin accessing User Management page is denied
    - Use `UserManagementPage` page object with admin auth fixture
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 14.2 Create `e2e/tests/rbac/role-access.spec.ts` (@critical)
    - Test: unauthenticated requests to protected routes redirect to login
    - Test: Subcontractor can access project views, ITP execution, NCR creation but NOT User Management
    - Test: Head Contractor can access ITP approval, sign-off, notification configuration
    - Test: Client can view projects and sign off Client-restricted points
    - Test: Admin can access all features including User Management
    - Use auth fixtures for each role, verify navigation and access patterns
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 15. Checkpoint — Verify all test specs compile and run
  - Ensure all tests pass against the running dev environment. Ask the user if questions arise.

- [x] 16. Create CI/CD workflow and documentation
  - [x] 16.1 Create `.github/workflows/e2e.yml` GitHub Actions workflow
    - Trigger on pull requests to main branch
    - Provision PostgreSQL 16 service container with health checks
    - Install Node.js 20, install dependencies (root, backend, frontend)
    - Run database migrations via `node backend/src/migrate-logic.js`
    - Install Playwright browsers (chromium only in CI for speed)
    - Run E2E tests with env vars (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, JWT_SECRET, NODE_ENV=test, APP_URL)
    - Upload test artifacts (screenshots, traces, HTML report) on failure
    - Set timeout to 15 minutes, use 2 workers
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [x] 16.2 Create `e2e/templates/feature-test.template.ts` — copy-paste template for new feature tests
    - Include import boilerplate for auth fixture and test-data constants
    - Include placeholder `test.describe` block with AAA (Arrange/Act/Assert) comments
    - Include instructions as comments for test-first workflow
    - _Requirements: 17.2, 17.3_

  - [x] 16.3 Create `e2e/README.md` — test-first workflow documentation
    - Document the test-first approach: write failing E2E test → implement feature → verify test passes
    - Document how to run tests locally (headed, UI mode, by tag)
    - Document how to add new page objects and fixtures
    - Document test tagging conventions (@smoke, @regression, @critical)
    - Reference the template file for starting new feature tests
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [x] 17. Final checkpoint — Full suite validation
  - Ensure all tests pass, CI workflow is valid YAML, and documentation is complete. Ask the user if questions arise.

## Notes

- No property-based tests — E2E tests verify specific user workflows through a browser; PBT is not applicable
- Tests run against the existing development database directly (no separate test DB)
- Email testing: NOTIFICATION_BUCKET is not set in test env, so email service skips S3 writes. Tests verify tokens are created in DB and navigate directly to token-based URLs
- Seed script uses high IDs (9000+) and `@test.local` emails to avoid collision with real dev data
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation of the framework

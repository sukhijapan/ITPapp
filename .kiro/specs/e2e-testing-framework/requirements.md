# Requirements Document

## Introduction

This document defines the requirements for an automated end-to-end (E2E) testing framework using Playwright for the Construction Quality Management App (ITP/NCR management system). The framework provides comprehensive test coverage for all existing features and establishes a test-first development workflow for future features. The app is a full-stack application with a Node.js/Express backend (PostgreSQL) and a React/TypeScript frontend (Vite).

## Glossary

- **Test_Framework**: The Playwright-based E2E testing infrastructure including configuration, utilities, fixtures, and test suites
- **Test_Runner**: The Playwright test runner that executes E2E test suites against the running application
- **Page_Object**: A class encapsulating page-specific selectors and interaction methods to reduce test duplication
- **Test_Fixture**: A reusable setup/teardown mechanism providing authenticated sessions, seeded data, or preconfigured state
- **Seed_Script**: A script that populates the development database with deterministic test data before test execution
- **Auth_Helper**: A utility that programmatically obtains JWT tokens for test users without navigating the login UI
- **CI_Pipeline**: The continuous integration environment (GitHub Actions or equivalent) that runs E2E tests on code changes
- **App**: The Construction Quality Management application consisting of the backend API and frontend SPA
- **ITP**: Inspection Test Plan — a structured checklist of inspection points for construction quality verification
- **NCR**: Non-Conformance Report — a defect record raised when an inspection point fails
- **HP**: Hold Point — an inspection point type requiring mandatory sign-off before work proceeds
- **WP**: Witness Point — an inspection point type where an observer is notified and may attend
- **Role**: One of four user roles: Subcontractor (1), Head Contractor (2), Client (3), Admin (4)

## Requirements

### Requirement 1: Playwright Infrastructure Setup

**User Story:** As a developer, I want a fully configured Playwright testing environment, so that I can write and run E2E tests locally and in CI with minimal setup.

#### Acceptance Criteria

1. THE Test_Framework SHALL include a Playwright configuration file at the project root that defines browser targets (Chromium, Firefox, WebKit), base URL, test directory, and timeout settings
2. THE Test_Framework SHALL define npm scripts in a root-level package.json for running all tests, running tests by tag, and running tests in headed mode
3. WHEN the `npm run test:e2e` command is executed, THE Test_Runner SHALL start the backend server and frontend dev server before executing tests
4. THE Test_Framework SHALL store test artifacts (screenshots, videos, traces) in a `.playwright/` directory excluded from version control
5. IF a test fails, THEN THE Test_Runner SHALL capture a screenshot and Playwright trace for debugging
6. THE Test_Framework SHALL reuse the existing development database and `.env` configuration, requiring no separate database setup

### Requirement 2: Test Data Seeding

**User Story:** As a developer, I want deterministic test data seeded into the development database, so that E2E tests have the data they need without requiring a separate database.

#### Acceptance Criteria

1. WHEN the E2E test suite starts, THE Seed_Script SHALL run migrations and insert test data into the existing development database
2. THE Seed_Script SHALL insert deterministic test users for each Role (Subcontractor, Head Contractor, Client, Admin) with known credentials
3. THE Seed_Script SHALL insert at least one project, one ITP template with points of each type (HP, WP, RP, SP, IP), and one ITP instance in each status (Draft, Pending Review, Open, Closed)
4. THE Seed_Script SHALL insert at least one open NCR and one closed NCR linked to ITP points
5. THE Seed_Script SHALL be idempotent — running it multiple times SHALL produce the same database state without duplicating data
6. THE Seed_Script SHALL use INSERT ... ON CONFLICT or equivalent upsert logic to avoid failures when test data already exists

### Requirement 3: Authentication Test Utilities

**User Story:** As a developer, I want reusable authentication helpers, so that tests can quickly obtain authenticated sessions without repeating login flows.

#### Acceptance Criteria

1. THE Auth_Helper SHALL provide a function that accepts a user role and returns a valid JWT token by calling the backend login API with seeded credentials
2. THE Test_Framework SHALL provide a Playwright fixture that injects an authenticated browser context (with stored auth state) for each Role
3. WHEN a test requires an authenticated session, THE Test_Framework SHALL reuse stored authentication state rather than navigating through the login page for every test
4. THE Auth_Helper SHALL store authentication state files in a `.playwright/.auth/` directory, one per Role
5. WHEN the stored authentication state expires or is invalid, THE Auth_Helper SHALL re-authenticate and update the stored state

### Requirement 4: Authentication Feature Tests

**User Story:** As a QA engineer, I want E2E tests covering all authentication flows, so that login, registration, and password reset are verified end-to-end.

#### Acceptance Criteria

1. WHEN valid credentials are submitted on the login page, THE Test_Runner SHALL verify that the user is redirected to the Dashboard and the welcome message displays the user's name
2. WHEN invalid credentials are submitted on the login page, THE Test_Runner SHALL verify that an error message is displayed and the user remains on the login page
3. WHEN a deactivated user attempts to login, THE Test_Runner SHALL verify that the same generic error message is displayed (no information leakage)
4. WHEN a valid invitation token is used on the registration page, THE Test_Runner SHALL verify that the user can set a password and is redirected to the Dashboard
5. WHEN an expired or invalid invitation token is used, THE Test_Runner SHALL verify that an appropriate error message is displayed
6. WHEN the forgot password form is submitted, THE Test_Runner SHALL verify that a generic success message is displayed regardless of whether the email exists
7. WHEN a valid reset token is used on the reset password page, THE Test_Runner SHALL verify that the password can be changed successfully

### Requirement 5: Project Management Tests

**User Story:** As a QA engineer, I want E2E tests covering project management, so that the dashboard and project details pages are verified.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to the Dashboard, THE Test_Runner SHALL verify that project cards, statistics (Open ITPs, Blocking HPs, Open NCRs, Pending Review, Closed ITPs), and the logout button are displayed
2. WHEN a project card is clicked, THE Test_Runner SHALL verify navigation to the project details page showing ITP instances and template management options
3. WHEN the Admin user navigates to the Dashboard, THE Test_Runner SHALL verify that the User Management link is visible
4. WHEN a non-Admin user navigates to the Dashboard, THE Test_Runner SHALL verify that the User Management link is not visible

### Requirement 6: ITP Template Builder Tests

**User Story:** As a QA engineer, I want E2E tests covering ITP template creation, so that the template builder workflow is verified end-to-end.

#### Acceptance Criteria

1. WHEN a user navigates to the template builder page, THE Test_Runner SHALL verify that the form for creating a new template with name, description, and inspection points is displayed
2. WHEN a user adds inspection points with different types (HP, WP, RP, SP, IP), THE Test_Runner SHALL verify that each point type is correctly saved with its acceptance criteria, reference documents, and approver role
3. WHEN a user submits a valid template, THE Test_Runner SHALL verify that the template is created and appears in the project's template list
4. WHEN a user attempts to create a template with a duplicate name in the same project, THE Test_Runner SHALL verify that a conflict error is displayed
5. WHEN a user deletes a template, THE Test_Runner SHALL verify that the template and all related data are removed

### Requirement 7: Template Library Tests

**User Story:** As a QA engineer, I want E2E tests covering the global template library, so that browsing, cloning, and publishing templates are verified.

#### Acceptance Criteria

1. WHEN a user navigates to the template library page, THE Test_Runner SHALL verify that public templates are displayed grouped by trade category
2. WHEN a user clones a library template into their project, THE Test_Runner SHALL verify that a copy of the template with all points is created in the target project
3. WHEN a user publishes a project template to the library, THE Test_Runner SHALL verify that the template becomes visible in the global library with the specified trade category and version

### Requirement 8: ITP Execution Tests

**User Story:** As a QA engineer, I want E2E tests covering ITP instance creation and execution, so that the full ITP lifecycle is verified.

#### Acceptance Criteria

1. WHEN a user creates an ITP instance from a template, THE Test_Runner SHALL verify that the instance is created in Draft status with all template points copied
2. WHEN a Subcontractor submits a Draft ITP for review, THE Test_Runner SHALL verify that the status changes to Pending Review
3. WHEN a Head Contractor approves a Pending Review ITP, THE Test_Runner SHALL verify that the status changes to Open
4. WHEN a Head Contractor rejects a Pending Review ITP, THE Test_Runner SHALL verify that the status returns to Draft with the rejection reason preserved
5. WHEN an authorized user signs off an inspection point as Approved, THE Test_Runner SHALL verify that the point status updates and the signer information is recorded
6. WHEN a user attempts to sign off a point blocked by a preceding unsigned HP, THE Test_Runner SHALL verify that an appropriate blocking error is displayed
7. WHEN all points in an ITP are signed off, THE Test_Runner SHALL verify that the ITP status automatically changes to Closed
8. WHEN a user with an incorrect role attempts to sign off a role-restricted point, THE Test_Runner SHALL verify that a permission error is displayed

### Requirement 9: NCR Management Tests

**User Story:** As a QA engineer, I want E2E tests covering NCR creation and lifecycle, so that defect management is verified end-to-end.

#### Acceptance Criteria

1. WHEN a user rejects an inspection point and creates an NCR, THE Test_Runner SHALL verify that the NCR is created with Open status and the point status changes to Rejected
2. WHEN a user navigates to the NCR list page, THE Test_Runner SHALL verify that NCRs are displayed with project context, status, and creation date
3. WHEN a user opens an NCR detail page, THE Test_Runner SHALL verify that all NCR fields, audit trail, and linked ITP point information are displayed
4. WHEN a user updates NCR fields (root cause, corrective action, disposition), THE Test_Runner SHALL verify that the changes are persisted
5. WHEN a user resolves an NCR, THE Test_Runner SHALL verify that the NCR status changes to Closed
6. WHEN an NCR is open on a point, THE Test_Runner SHALL verify that the point cannot be approved until the NCR is resolved

### Requirement 10: Witness Point Notification Tests

**User Story:** As a QA engineer, I want E2E tests covering witness point notifications, so that the notification lifecycle including responses and auto-waiver is verified.

#### Acceptance Criteria

1. WHEN a Subcontractor raises a witness point notification with a planned inspection time and recipients, THE Test_Runner SHALL verify that the notification is created in Pending status
2. WHEN an internal recipient responds to a notification with confirm, decline, or reschedule, THE Test_Runner SHALL verify that the response is recorded and the notification status updates accordingly
3. WHEN the notification creator cancels a pending notification, THE Test_Runner SHALL verify that the status changes to Cancelled
4. WHEN an external recipient accesses the response page via a valid token URL, THE Test_Runner SHALL verify that the notification context is displayed and a response can be submitted
5. WHEN an external recipient uses an expired or already-used token, THE Test_Runner SHALL verify that an appropriate error message is displayed
6. WHEN a non-Subcontractor/non-Head-Contractor user attempts to raise a notification, THE Test_Runner SHALL verify that a permission error is returned

### Requirement 11: External Sign-Off Tests

**User Story:** As a QA engineer, I want E2E tests covering the external sign-off workflow, so that token-based external approvals are verified.

#### Acceptance Criteria

1. WHEN an internal user requests an external sign-off for an ITP point, THE Test_Runner SHALL verify that a token is generated and the request is recorded
2. WHEN an external party accesses the sign-off page via a valid token URL, THE Test_Runner SHALL verify that the ITP point context is displayed
3. WHEN an external party submits an approval via the token page, THE Test_Runner SHALL verify that the point status updates to Approved with the external signer's details
4. WHEN an external party uses an expired or already-used token, THE Test_Runner SHALL verify that an appropriate error message is displayed

### Requirement 12: Media Upload Tests

**User Story:** As a QA engineer, I want E2E tests covering media upload with GPS coordinates, so that file attachments on inspection points are verified.

#### Acceptance Criteria

1. WHEN a user uploads a file to an inspection point, THE Test_Runner SHALL verify that the media record is created and associated with the correct point
2. WHEN a user uploads a file with GPS coordinates, THE Test_Runner SHALL verify that latitude and longitude values are stored with the media record
3. WHEN a user deletes an attachment from an unsigned point, THE Test_Runner SHALL verify that the media is removed
4. WHEN a user attempts to delete an attachment from a signed-off point, THE Test_Runner SHALL verify that a permission error is displayed

### Requirement 13: User Management and Invitation Tests

**User Story:** As a QA engineer, I want E2E tests covering user management, so that invitation, activation, deactivation, and role assignment are verified.

#### Acceptance Criteria

1. WHEN an Admin navigates to the User Management page, THE Test_Runner SHALL verify that the user list with roles and status is displayed
2. WHEN an Admin sends an invitation with a specified role, THE Test_Runner SHALL verify that the invitation is created and the registration link is functional
3. WHEN an Admin deactivates a user, THE Test_Runner SHALL verify that the user's status changes to inactive
4. WHEN an Admin activates a previously deactivated user, THE Test_Runner SHALL verify that the user's status changes to active
5. WHEN a non-Admin user attempts to access the User Management page, THE Test_Runner SHALL verify that access is denied or the page is not accessible

### Requirement 14: Role-Based Access Control Tests

**User Story:** As a QA engineer, I want E2E tests verifying role-based access control, so that permission boundaries are enforced across all features.

#### Acceptance Criteria

1. FOR EACH protected route, THE Test_Runner SHALL verify that unauthenticated requests are redirected to the login page
2. WHEN a Subcontractor user is authenticated, THE Test_Runner SHALL verify access to project views, ITP execution, and NCR creation but not User Management
3. WHEN a Head Contractor user is authenticated, THE Test_Runner SHALL verify access to ITP approval, sign-off, and notification configuration
4. WHEN a Client user is authenticated, THE Test_Runner SHALL verify access to view projects and sign off Client-restricted points
5. WHEN an Admin user is authenticated, THE Test_Runner SHALL verify access to all features including User Management

### Requirement 15: CI/CD Integration

**User Story:** As a developer, I want E2E tests integrated into the CI pipeline, so that regressions are caught before code is merged.

#### Acceptance Criteria

1. THE CI_Pipeline SHALL include a GitHub Actions workflow that runs the full E2E test suite on pull requests targeting the main branch
2. THE CI_Pipeline SHALL provision a PostgreSQL service container and run the Seed_Script before test execution
3. THE CI_Pipeline SHALL install Playwright browsers using the cached browser installation when available
4. IF any E2E test fails, THEN THE CI_Pipeline SHALL upload test artifacts (screenshots, traces, HTML report) as workflow artifacts
5. THE CI_Pipeline SHALL run tests in parallel across multiple workers to minimize execution time
6. THE CI_Pipeline SHALL complete the full E2E test suite within 15 minutes

### Requirement 16: Test Organization and Conventions

**User Story:** As a developer, I want consistent test organization and naming conventions, so that tests are easy to find, maintain, and extend.

#### Acceptance Criteria

1. THE Test_Framework SHALL organize test files in an `e2e/tests/` directory with subdirectories matching feature areas (auth, projects, itps, ncrs, witness-points, external-sign-off, media, users)
2. THE Test_Framework SHALL organize Page Objects in an `e2e/pages/` directory with one file per page
3. THE Test_Framework SHALL name test files using the pattern `{feature}.spec.ts` (e.g., `login.spec.ts`, `itp-execution.spec.ts`)
4. THE Test_Framework SHALL use descriptive test names following the pattern "should [expected behavior] when [condition]"
5. THE Test_Framework SHALL support test tagging with annotations (@smoke, @regression, @critical) to enable selective test execution

### Requirement 17: Test-First Development Workflow

**User Story:** As a developer, I want a documented test-first workflow, so that new features are developed with E2E tests written before implementation code.

#### Acceptance Criteria

1. THE Test_Framework SHALL include a documented workflow guide (CONTRIBUTING.md or similar) describing the test-first approach: write failing E2E test, implement feature, verify test passes
2. THE Test_Framework SHALL provide a test template file that developers can copy when starting a new feature's E2E tests
3. THE Test_Framework SHALL include example Page Object and fixture patterns that demonstrate how to extend the framework for new features
4. WHEN a new feature spec is created, THE Test_Framework documentation SHALL reference the requirement to write E2E tests as the first implementation task

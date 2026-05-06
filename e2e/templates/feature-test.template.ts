import { test, expect } from '../fixtures/auth.fixture';
import { TEST_USERS } from '../test-data/constants';

// ============================================================
// Feature Test Template
// ============================================================
//
// Instructions:
// 1. Copy this file to e2e/tests/{feature-area}/{feature}.spec.ts
// 2. Replace [FEATURE_NAME] with the actual feature name
// 3. Replace placeholders with actual page objects and assertions
// 4. Write tests BEFORE implementing the feature (test-first workflow)
// 5. Each test should map to one acceptance criterion from the spec
// 6. Tag tests with @smoke, @regression, or @critical as appropriate
//
// Test-First Workflow:
//   a) Write the failing E2E test based on the spec's acceptance criteria
//   b) Run the test to confirm it fails (red)
//   c) Implement the feature code
//   d) Run the test again to confirm it passes (green)
//   e) Refactor if needed, keeping tests green
//
// Tips:
// - Import page objects from e2e/pages/ for clean interactions
// - Use auth fixtures (subcontractorContext, headContractorContext, etc.) for role-based tests
// - Use TEST_USERS, TEST_PROJECT, TEST_TEMPLATE from constants for seeded data
// - Follow AAA pattern: Arrange → Act → Assert
// ============================================================

test.describe('Feature: [FEATURE_NAME]', () => {
  test('should [expected behavior] when [condition] @regression', async ({ page }) => {
    // Arrange: navigate to the relevant page
    // await page.goto('/your-page');

    // Act: perform the user action
    // await page.locator('selector').click();

    // Assert: verify the expected outcome
    // await expect(page.locator('selector')).toBeVisible();
  });

  test('should [expected behavior] when [another condition] @regression', async ({ page }) => {
    // Arrange

    // Act

    // Assert
  });
});

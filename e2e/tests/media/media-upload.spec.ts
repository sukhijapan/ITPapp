import { test, expect } from '../../fixtures/auth.fixture';
import { ITPExecutionPage } from '../../pages/itp-execution.page';
import { TEST_ITP_INSTANCES } from '../../test-data/constants';

/**
 * Media Upload E2E Tests
 *
 * Tests cover:
 * - Uploading a file to an inspection point creates a media record
 * - Uploading with GPS coordinates stores latitude and longitude
 * - Deleting attachment from unsigned point removes the media
 * - Deleting attachment from signed-off point shows permission error
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4
 */

/** Generate a minimal 1x1 PNG buffer for upload tests */
function createTestPngBuffer(): Buffer {
  // Minimal valid 1x1 pixel PNG (67 bytes)
  const pngBytes = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8-bit RGB
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND chunk
    0x44, 0xae, 0x42, 0x60, 0x82,
  ];
  return Buffer.from(pngBytes);
}

test.describe('Media Upload @regression', () => {
  // Skip media upload tests when AWS credentials are not available (e.g., CI without S3)
  test.skip(
    !process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE,
    'Skipping media upload tests — AWS credentials not configured'
  );

  test('should create a media record associated with the correct point when uploading a file', async ({
    subcontractorContext,
  }) => {
    // Arrange
    const page = await subcontractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);

    // Navigate to the Open ITP (has unsigned points we can upload to)
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);
    await page.waitForLoadState('networkidle');

    // Find the Surveillance Point (sequence 4, approver_role_id 1 = Subcontractor)
    // which the subcontractor can interact with
    const pointCard = itpExecution.pointCards.nth(3); // SP at index 3 (0-based)
    await expect(pointCard).toBeVisible();

    // Act — trigger file upload via the hidden file input
    const fileInput = pointCard.locator('input[type="file"]');
    const testPng = createTestPngBuffer();
    await fileInput.setInputFiles({
      name: 'test-upload.png',
      mimeType: 'image/png',
      buffer: testPng,
    });

    // Assert — media item appears in the point's media section
    const mediaSection = pointCard.locator('.media-section');
    await expect(mediaSection.locator('.media-item-wrapper, .media-thumb, .media-file')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should store latitude and longitude when uploading with GPS coordinates', async ({
    subcontractorContext,
  }) => {
    // Arrange
    const page = await subcontractorContext.newPage();

    // Mock geolocation to provide GPS coordinates
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: -33.8688, longitude: 151.2093 });

    const itpExecution = new ITPExecutionPage(page);
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);
    await page.waitForLoadState('networkidle');

    // Use the Surveillance Point (index 3) which subcontractor can access
    const pointCard = itpExecution.pointCards.nth(3);
    await expect(pointCard).toBeVisible();

    // Act — upload a file (geolocation mock will provide coordinates)
    const fileInput = pointCard.locator('input[type="file"]');
    const testPng = createTestPngBuffer();
    await fileInput.setInputFiles({
      name: 'gps-test.png',
      mimeType: 'image/png',
      buffer: testPng,
    });

    // Assert — media item appears with GPS coordinates in the title attribute
    const mediaItem = pointCard.locator('.media-item-wrapper[title*="GPS"]');
    await expect(mediaItem).toBeVisible({ timeout: 15000 });

    // Verify the GPS coordinates are present in the title
    const title = await mediaItem.getAttribute('title');
    expect(title).toContain('-33.8688');
    expect(title).toContain('151.2093');
  });

  test('should remove media when deleting attachment from unsigned point', async ({
    subcontractorContext,
  }) => {
    // Arrange — upload a file first, then delete it
    const page = await subcontractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);
    await itpExecution.goto(TEST_ITP_INSTANCES.open.id);
    await page.waitForLoadState('networkidle');

    // Use the Surveillance Point (index 3)
    const pointCard = itpExecution.pointCards.nth(3);
    await expect(pointCard).toBeVisible();

    // Upload a file first
    const fileInput = pointCard.locator('input[type="file"]');
    const testPng = createTestPngBuffer();
    await fileInput.setInputFiles({
      name: 'to-delete.png',
      mimeType: 'image/png',
      buffer: testPng,
    });

    // Wait for the media item to appear
    const mediaSection = pointCard.locator('.media-section');
    const mediaItems = mediaSection.locator('.media-item-wrapper');
    await expect(mediaItems.first()).toBeVisible({ timeout: 15000 });

    // Count media items before deletion
    const countBefore = await mediaItems.count();

    // Act — click the delete button on the last uploaded media item
    // Accept the confirmation dialog
    page.on('dialog', (dialog) => dialog.accept());
    const deleteButton = mediaItems.last().locator('.media-delete-btn');
    await deleteButton.click();

    // Assert — media item is removed
    await expect(mediaItems).toHaveCount(countBefore - 1, { timeout: 10000 });
  });

  test('should show permission error when deleting attachment from signed-off point', async ({
    headContractorContext,
  }) => {
    // Arrange — use the API to attempt deletion of media on a signed-off point
    // First, navigate to the Closed ITP where all points are signed off
    const page = await headContractorContext.newPage();
    const itpExecution = new ITPExecutionPage(page);
    await itpExecution.goto(TEST_ITP_INSTANCES.closed.id);
    await page.waitForLoadState('networkidle');

    // On a signed-off point, the delete button should NOT be visible in the UI
    // (the frontend hides it when isSignedOff is true)
    const pointCard = itpExecution.pointCards.first();
    await expect(pointCard).toBeVisible();

    // Verify that no delete buttons are shown on signed-off points
    const deleteButtons = pointCard.locator('.media-delete-btn');
    await expect(deleteButtons).toHaveCount(0);

    // Additionally verify via API that attempting to delete returns 403
    // Get the token from localStorage for API call
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Get media for the closed ITP instance to find a media ID to attempt deletion
    const mediaResponse = await page.request.get(
      `http://localhost:3000/api/media/instance/${TEST_ITP_INSTANCES.closed.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // If there's media on the closed ITP, attempt to delete it and verify 403
    if (mediaResponse.ok()) {
      const mediaList = await mediaResponse.json();
      if (mediaList.length > 0) {
        const mediaId = mediaList[0].id;
        const deleteResponse = await page.request.delete(
          `http://localhost:3000/api/media/${mediaId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        expect(deleteResponse.status()).toBe(403);
        const body = await deleteResponse.json();
        expect(body.error).toContain('sign-off');
      }
    }
  });
});

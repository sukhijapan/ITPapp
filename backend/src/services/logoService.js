const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../db');

const s3 = new S3Client({});
const S3_BUCKET = process.env.S3_BUCKET;

const ALLOWED_MIMETYPES = ['image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB = 2,097,152 bytes

/**
 * Validates logo file constraints.
 * @param {string} mimetype
 * @param {number} fileSize
 * @returns {{valid: boolean, error?: string}}
 */
function validateLogoFile(mimetype, fileSize) {
  if (!ALLOWED_MIMETYPES.includes(mimetype)) {
    return { valid: false, error: 'Invalid file type. Only PNG and JPEG images are accepted.' };
  }
  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds the maximum allowed size of 2MB.' };
  }
  return { valid: true };
}

/**
 * Encodes an image buffer to a base64 data URI string.
 * Since we cannot use sharp (no new dependencies), we store the base64 as-is
 * and let the PDF builder handle display sizing constraints.
 * @param {Buffer} imageBuffer
 * @param {string} mimetype
 * @returns {Promise<string>} base64 data URI
 */
async function resizeAndEncode(imageBuffer, mimetype) {
  const base64 = imageBuffer.toString('base64');
  return `data:${mimetype};base64,${base64}`;
}

/**
 * Validates and uploads a project logo.
 * Handles replacement by deleting the old S3 object if one exists.
 * @param {number} projectId - Target project ID
 * @param {Buffer} fileBuffer - Raw image file buffer
 * @param {string} mimetype - File MIME type (e.g., 'image/png')
 * @param {number} fileSize - File size in bytes
 * @returns {Promise<{s3Key: string, base64DataUri: string}>}
 * @throws {Error} if file type or size invalid
 */
async function uploadLogo(projectId, fileBuffer, mimetype, fileSize) {
  const validation = validateLogoFile(mimetype, fileSize);
  if (!validation.valid) {
    const error = new Error(validation.error);
    error.statusCode = 400;
    throw error;
  }

  // Check if project already has a logo — best-effort delete old S3 object
  try {
    const existing = await db.query(
      'SELECT logo_s3_key FROM projects WHERE id = $1',
      [projectId]
    );
    if (existing.rows.length > 0 && existing.rows[0].logo_s3_key) {
      await s3.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: existing.rows[0].logo_s3_key,
      })).catch((err) => {
        console.warn(`[LogoService] Failed to delete old logo from S3: ${err.message}`);
      });
    }
  } catch (err) {
    console.warn(`[LogoService] Could not check for existing logo: ${err.message}`);
  }

  // Generate base64 data URI for PDF embedding (always succeeds — no external deps)
  const base64DataUri = await resizeAndEncode(fileBuffer, mimetype);

  // Best-effort S3 upload — PDF generation uses the base64 in DB, not S3
  const ext = mimetype === 'image/png' ? 'png' : 'jpg';
  const s3Key = `logos/${projectId}/logo.${ext}`;
  let storedS3Key = null;
  if (S3_BUCKET) {
    try {
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimetype,
      }));
      storedS3Key = s3Key;
    } catch (err) {
      console.warn(`[LogoService] S3 upload failed (logo saved to DB only): ${err.message}`);
    }
  }

  // Store base64 and timestamp in DB — this is the authoritative copy for PDF generation
  await db.query(
    `UPDATE projects
     SET logo_s3_key = $1, logo_mime_type = $2, logo_base64 = $3, logo_uploaded_at = NOW()
     WHERE id = $4`,
    [storedS3Key, mimetype, base64DataUri, projectId]
  );

  return { s3Key: storedS3Key, base64DataUri };
}

/**
 * Retrieves the base64 data URI for a project's logo.
 * @param {number} projectId
 * @returns {Promise<string|null>} base64 data URI or null if no logo
 */
async function getLogoBase64(projectId) {
  const result = await db.query(
    'SELECT logo_base64 FROM projects WHERE id = $1',
    [projectId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].logo_base64 || null;
}

/**
 * Retrieves logo metadata (hasLogo flag + uploadedAt timestamp) for a project.
 * @param {number} projectId
 * @returns {Promise<{hasLogo: boolean, uploadedAt: string|null}>}
 */
async function getLogoMeta(projectId) {
  const result = await db.query(
    'SELECT logo_base64, logo_uploaded_at FROM projects WHERE id = $1',
    [projectId]
  );
  if (result.rows.length === 0) return { hasLogo: false, uploadedAt: null };
  const row = result.rows[0];
  return {
    hasLogo: !!row.logo_base64,
    uploadedAt: row.logo_uploaded_at || null,
  };
}

/**
 * Deletes the existing logo for a project (S3 + DB).
 * @param {number} projectId
 */
async function deleteLogo(projectId) {
  // Fetch current S3 key
  const result = await db.query(
    'SELECT logo_s3_key FROM projects WHERE id = $1',
    [projectId]
  );

  if (result.rows.length > 0 && result.rows[0].logo_s3_key) {
    // Delete from S3
    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: result.rows[0].logo_s3_key,
      }));
    } catch (err) {
      console.warn(`[LogoService] Failed to delete logo from S3: ${err.message}`);
    }
  }

  // Clear logo columns in DB
  await db.query(
    `UPDATE projects 
     SET logo_s3_key = NULL, logo_mime_type = NULL, logo_base64 = NULL, logo_uploaded_at = NULL
     WHERE id = $1`,
    [projectId]
  );
}

module.exports = {
  validateLogoFile,
  resizeAndEncode,
  uploadLogo,
  getLogoBase64,
  getLogoMeta,
  deleteLogo,
};

const db = require('../db');

const ALLOWED_MIMETYPES = ['image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

function validateLogoFile(mimetype, fileSize) {
  if (!ALLOWED_MIMETYPES.includes(mimetype)) {
    return { valid: false, error: 'Invalid file type. Only PNG and JPEG images are accepted.' };
  }
  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds the maximum allowed size of 2MB.' };
  }
  return { valid: true };
}

async function uploadLogo(projectId, fileBuffer, mimetype, fileSize) {
  const validation = validateLogoFile(mimetype, fileSize);
  if (!validation.valid) {
    const error = new Error(validation.error);
    error.statusCode = 400;
    throw error;
  }

  // Client converts to JPEG before upload (Canvas API). Server encodes as-is.
  const base64DataUri = `data:${mimetype};base64,${fileBuffer.toString('base64')}`;

  console.log(`[LogoService] Storing logo for project ${projectId}: mimetype=${mimetype} bufferBytes=${fileBuffer.length} base64Chars=${base64DataUri.length}`);

  await db.query(
    `UPDATE projects
     SET logo_mime_type = $1, logo_base64 = $2, logo_uploaded_at = NOW()
     WHERE id = $3`,
    [mimetype, base64DataUri, projectId]
  );

  console.log(`[LogoService] Logo stored successfully for project ${projectId}`);
  return { base64DataUri };
}

async function getLogoBase64(projectId) {
  const result = await db.query(
    'SELECT logo_base64 FROM projects WHERE id = $1',
    [projectId]
  );
  if (result.rows.length === 0) {
    console.log(`[LogoService] getLogoBase64: no project row found for id=${projectId}`);
    return null;
  }
  const val = result.rows[0].logo_base64;
  console.log(`[LogoService] getLogoBase64 project=${projectId}: ${val ? `found (${val.length} chars)` : 'null/empty'}`);
  return val || null;
}

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

async function deleteLogo(projectId) {
  await db.query(
    `UPDATE projects
     SET logo_mime_type = NULL, logo_base64 = NULL, logo_uploaded_at = NULL
     WHERE id = $1`,
    [projectId]
  );
}

module.exports = {
  validateLogoFile,
  uploadLogo,
  getLogoBase64,
  getLogoMeta,
  deleteLogo,
};

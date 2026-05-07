const { uploadLogo, getLogoMeta, deleteLogo } = require('../services/logoService');

/**
 * POST /projects/:id/logo
 * Upload or replace a project logo.
 * Expects multer middleware to have parsed the file into req.file.
 */
exports.uploadLogo = async (req, res) => {
  const projectId = req.params.id;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please provide a logo image.' });
  }

  try {
    const { s3Key } = await uploadLogo(
      projectId,
      req.file.buffer,
      req.file.mimetype,
      req.file.size
    );

    res.status(201).json({ s3Key, message: 'Logo uploaded successfully.' });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[LogoController] Upload error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to upload logo.', detail: err.message });
  }
};

/**
 * GET /projects/:id/logo
 * Returns { hasLogo, logoBase64, uploadedAt } for a project.
 */
exports.getLogo = async (req, res) => {
  const projectId = req.params.id;

  try {
    const meta = await getLogoMeta(projectId);
    res.status(200).json(meta);
  } catch (err) {
    console.error('[LogoController] Get logo error:', err.message);
    res.status(200).json({ hasLogo: false, uploadedAt: null });
  }
};

/**
 * DELETE /projects/:id/logo
 * Remove the logo for a project.
 */
exports.deleteLogo = async (req, res) => {
  const projectId = req.params.id;

  try {
    await deleteLogo(projectId);
    res.status(204).send();
  } catch (err) {
    console.error('[LogoController] Delete logo error:', err.message);
    res.status(500).json({ error: 'Failed to delete logo.' });
  }
};

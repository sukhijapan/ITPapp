const logoService = require('../services/logoService');

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
    const { s3Key } = await logoService.uploadLogo(
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
    console.error('[LogoController] Upload error:', err);
    res.status(500).json({ error: 'Failed to upload logo.' });
  }
};

/**
 * GET /projects/:id/logo
 * Retrieve the logo base64 data URI for a project.
 */
exports.getLogo = async (req, res) => {
  const projectId = req.params.id;

  try {
    const logoBase64 = await logoService.getLogoBase64(projectId);

    if (!logoBase64) {
      return res.status(404).json({ error: 'No logo found for this project.' });
    }

    res.status(200).json({ logoBase64 });
  } catch (err) {
    console.error('[LogoController] Get logo error:', err);
    res.status(500).json({ error: 'Failed to retrieve logo.' });
  }
};

/**
 * DELETE /projects/:id/logo
 * Remove the logo for a project.
 */
exports.deleteLogo = async (req, res) => {
  const projectId = req.params.id;

  try {
    await logoService.deleteLogo(projectId);
    res.status(204).send();
  } catch (err) {
    console.error('[LogoController] Delete logo error:', err);
    res.status(500).json({ error: 'Failed to delete logo.' });
  }
};

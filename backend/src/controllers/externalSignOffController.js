const externalSignOffService = require('../services/externalSignOffService');

/**
 * POST /api/external-sign-off/request
 * Authenticated endpoint for internal users to request an external sign-off.
 */
exports.requestSignOff = async (req, res) => {
  const { pointId, email, roleName } = req.body;
  const requesterId = req.user.userId;

  if (!pointId || !email || !roleName) {
    return res.status(400).json({ error: 'pointId, email, and roleName are required' });
  }

  try {
    const result = await externalSignOffService.requestExternalSignOff(pointId, email, roleName, requesterId);
    res.status(201).json({ message: 'External sign-off request sent', data: result });
  } catch (err) {
    console.error('[ExternalSignOffController] requestSignOff error:', err);
    res.status(500).json({ error: 'Failed to request external sign-off' });
  }
};

/**
 * GET /api/external-sign-off/validate/:token
 * Public endpoint to validate a token and get context for the sign-off page.
 */
exports.validateToken = async (req, res) => {
  const { token } = req.params;

  try {
    const data = await externalSignOffService.validateToken(token);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * POST /api/external-sign-off/execute
 * Public endpoint to perform the sign-off using a token.
 */
exports.executeSignOff = async (req, res) => {
  const { token, status, comments } = req.body;

  if (!token || !status) {
    return res.status(400).json({ error: 'token and status are required' });
  }

  try {
    const result = await externalSignOffService.executeExternalSignOff(token, status, comments);
    res.json(result);
  } catch (err) {
    console.error('[ExternalSignOffController] executeSignOff error:', err);
    res.status(400).json({ error: err.message });
  }
};

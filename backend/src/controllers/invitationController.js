const invitationService = require('../services/invitationService');

/**
 * POST /api/invitations
 * Create a new invitation. Requires auth + Admin (4) or Head Contractor (2) role.
 */
exports.createInvitation = async (req, res) => {
  const { email, role_id, full_name } = req.body;

  if (!email || !role_id || !full_name) {
    return res.status(400).json({ error: 'Email, role_id, and full_name are required' });
  }

  try {
    const invitation = await invitationService.createInvitation(
      email,
      role_id,
      req.user.userId,
      full_name
    );
    res.status(201).json(invitation);
  } catch (err) {
    if (err.message === 'Email already registered') {
      return res.status(409).json({ error: err.message });
    }
    if (err.message === 'Invalid role') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[InvitationController] createInvitation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/invitations/:token/validate
 * Validate an invitation token. Public endpoint.
 */
exports.validateToken = async (req, res) => {
  const { token } = req.params;

  try {
    const result = await invitationService.validateToken(token);
    res.status(200).json(result);
  } catch (err) {
    console.error('[InvitationController] validateToken error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/invitations/pending
 * List all pending invitations. Requires auth + Admin (4) role.
 */
exports.getPendingInvitations = async (req, res) => {
  try {
    const invitations = await invitationService.getPendingInvitations();
    res.status(200).json(invitations);
  } catch (err) {
    console.error('[InvitationController] getPendingInvitations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/invitations/:id/resend
 * Resend an invitation. Requires auth + Admin (4) or Head Contractor (2) role.
 */
exports.resendInvitation = async (req, res) => {
  const { id } = req.params;

  try {
    const invitation = await invitationService.resendInvitation(
      parseInt(id, 10),
      req.user.userId
    );
    res.status(201).json(invitation);
  } catch (err) {
    if (err.message === 'Invitation not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === 'Email already registered') {
      return res.status(409).json({ error: err.message });
    }
    if (err.message === 'Invalid role') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[InvitationController] resendInvitation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/invitations/:id
 * Cancel (invalidate) a pending invitation. Requires auth + Admin (4) or Head Contractor (2) role.
 */
exports.cancelInvitation = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = require('../db');
    const result = await pool.query(
      `UPDATE invitations SET status = 'invalidated' WHERE id = $1 AND status = 'pending' RETURNING *`,
      [parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already used' });
    }

    res.status(200).json({ message: 'Invitation cancelled', invitation: result.rows[0] });
  } catch (err) {
    console.error('[InvitationController] cancelInvitation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

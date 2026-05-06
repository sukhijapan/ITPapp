const crypto = require('crypto');
const pool = require('../db');
const emailService = require('./emailService');

const INVITATION_EXPIRY_HOURS = 72;

/**
 * Create a new invitation for a user.
 * Generates a secure token, invalidates any pending invitation for the same email,
 * inserts the invitation record, and sends the invitation email.
 *
 * @param {string} email - The email address to invite
 * @param {number} roleId - The role_id to assign
 * @param {number} invitedBy - The user ID of the inviter
 * @param {string} fullName - The full name of the invitee
 * @returns {Promise<object>} The created invitation record
 */
async function createInvitation(email, roleId, invitedBy, fullName) {
  // Check if email already exists in users table
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  if (existingUser.rows.length > 0) {
    throw new Error('Email already registered');
  }

  // Validate that role_id exists in roles table
  const roleResult = await pool.query(
    'SELECT id, name FROM roles WHERE id = $1',
    [roleId]
  );
  if (roleResult.rows.length === 0) {
    throw new Error('Invalid role');
  }

  const roleName = roleResult.rows[0].name;

  // Look up inviter's full name and email
  const inviterResult = await pool.query(
    'SELECT full_name, email FROM users WHERE id = $1',
    [invitedBy]
  );
  const inviterName = inviterResult.rows.length > 0 ? inviterResult.rows[0].full_name : 'An administrator';
  const inviterEmail = inviterResult.rows.length > 0 ? inviterResult.rows[0].email : '';

  // Invalidate any pending invitation for the same email
  await pool.query(
    `UPDATE invitations SET status = 'invalidated' WHERE email = $1 AND status = 'pending'`,
    [email]
  );

  // Generate secure token — store only the SHA-256 hash in DB; send raw token in email
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Calculate expiry (72 hours from now)
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

  // Insert invitation record
  const result = await pool.query(
    `INSERT INTO invitations (email, role_id, token, invited_by, full_name, status, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
     RETURNING *`,
    [email, roleId, tokenHash, invitedBy, fullName, createdAt, expiresAt]
  );

  const invitation = result.rows[0];

  // Send invitation email (non-blocking — catch errors but retain the record)
  try {
    await emailService.sendInvitationEmail(email, rawToken, roleName, inviterName, inviterEmail);
  } catch (error) {
    console.error(
      `[InvitationService] Email delivery failed for ${email}:`,
      error.message,
      error.code || ''
    );
    // Invitation record persists even if email fails (Requirement 8.3)
  }

  return invitation;
}

/**
 * Validate an invitation token.
 * Checks existence, status='pending', and not expired.
 *
 * @param {string} token - The invitation token to validate
 * @returns {Promise<object>} Validation result with valid flag, email, roleId, and optional error
 */
async function validateToken(rawToken) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const result = await pool.query(
    'SELECT * FROM invitations WHERE token = $1',
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return { valid: false, error: 'Token invalid' };
  }

  const invitation = result.rows[0];

  if (invitation.status === 'used') {
    return { valid: false, error: 'Token already used' };
  }

  if (invitation.status === 'invalidated') {
    return { valid: false, error: 'Token invalid' };
  }

  if (invitation.status !== 'pending') {
    return { valid: false, error: 'Token invalid' };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { valid: false, error: 'Token expired' };
  }

  return {
    valid: true,
    email: invitation.email,
    roleId: invitation.role_id,
    fullName: invitation.full_name,
  };
}

/**
 * Invalidate an invitation token by setting its status to 'invalidated'.
 *
 * @param {string} token - The invitation token to invalidate
 * @returns {Promise<void>}
 */
async function invalidateToken(rawToken) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await pool.query(
    `UPDATE invitations SET status = 'invalidated' WHERE token = $1`,
    [tokenHash]
  );
}

/**
 * Get all pending invitations.
 *
 * @returns {Promise<object[]>} Array of pending invitation records
 */
async function getPendingInvitations() {
  const result = await pool.query(
    `SELECT i.*, r.name as role_name
     FROM invitations i
     JOIN roles r ON r.id = i.role_id
     WHERE i.status = 'pending'
     ORDER BY i.created_at DESC`
  );
  return result.rows;
}

/**
 * Resend an invitation by invalidating the old token and creating a new invitation.
 *
 * @param {number} invitationId - The ID of the existing invitation to resend
 * @param {number} invitedBy - The user ID of the person resending
 * @returns {Promise<object>} The new invitation record
 */
async function resendInvitation(invitationId, invitedBy) {
  // Fetch the existing invitation
  const existing = await pool.query(
    'SELECT * FROM invitations WHERE id = $1',
    [invitationId]
  );

  if (existing.rows.length === 0) {
    throw new Error('Invitation not found');
  }

  const oldInvitation = existing.rows[0];

  // Invalidate the old token
  await pool.query(
    `UPDATE invitations SET status = 'invalidated' WHERE id = $1`,
    [invitationId]
  );

  // Create a new invitation for the same email, role, and full_name
  return createInvitation(oldInvitation.email, oldInvitation.role_id, invitedBy, oldInvitation.full_name);
}

module.exports = {
  createInvitation,
  validateToken,
  invalidateToken,
  getPendingInvitations,
  resendInvitation,
};

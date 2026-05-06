const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const emailService = require('./emailService');
const passwordValidator = require('../utils/passwordValidator');

/**
 * Password Reset Service
 *
 * Handles reset token lifecycle: creation, validation, and password update.
 * Designed to prevent email enumeration — all public-facing operations
 * return the same response regardless of whether the email exists.
 */

/**
 * Create a password reset token for the given email.
 * Always succeeds (no email enumeration) — if the email doesn't exist,
 * the function completes silently without sending an email.
 *
 * @param {string} email - The email address to send the reset link to
 * @returns {Promise<void>}
 */
async function createResetToken(email) {
  try {
    // Lookup user by email
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // User not found — return silently to prevent email enumeration
      return;
    }

    const user = userResult.rows[0];

    // Generate cryptographically secure token — store hash, send raw token in email
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Set expiry to 1 hour from now
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 60 * 60 * 1000); // +1 hour

    // Insert reset token record
    await pool.query(
      `INSERT INTO password_resets (user_id, token, created_at, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, tokenHash, createdAt, expiresAt]
    );

    // Send reset email (non-blocking failure — log but don't throw)
    try {
      await emailService.sendPasswordResetEmail(user.email, rawToken);
    } catch (emailError) {
      console.error(
        `[PasswordResetService] Failed to send reset email to ${user.email}:`,
        emailError.message
      );
    }
  } catch (error) {
    // Log unexpected errors but don't expose them (prevent enumeration)
    console.error('[PasswordResetService] Error in createResetToken:', error.message);
  }
}

/**
 * Validate a password reset token.
 * Checks that the token exists, has not been used, and has not expired.
 *
 * @param {string} token - The reset token to validate
 * @returns {Promise<{ valid: boolean, userId?: number, error?: string }>}
 */
async function validateResetToken(rawToken) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const result = await pool.query(
    'SELECT id, user_id, used, expires_at FROM password_resets WHERE token = $1',
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return { valid: false, error: 'Token invalid' };
  }

  const resetRecord = result.rows[0];

  if (resetRecord.used) {
    return { valid: false, error: 'Token already used' };
  }

  if (new Date(resetRecord.expires_at) < new Date()) {
    return { valid: false, error: 'Token expired' };
  }

  return { valid: true, userId: resetRecord.user_id };
}

/**
 * Reset a user's password using a valid reset token.
 * Validates the new password, updates the password hash, and marks the token as used.
 *
 * @param {string} token - The reset token
 * @param {string} newPassword - The new password to set
 * @returns {Promise<void>}
 * @throws {Error} If token is invalid/expired or password doesn't meet requirements
 */
async function resetPassword(rawToken, newPassword) {
  // Validate the new password
  const validation = passwordValidator.validate(newPassword);
  if (!validation.valid) {
    const error = new Error('Password validation failed');
    error.details = validation.errors;
    throw error;
  }

  // Validate the token
  const tokenValidation = await validateResetToken(rawToken);
  if (!tokenValidation.valid) {
    throw new Error(tokenValidation.error);
  }

  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Update user's password and mark token as used in a transaction
  const client = await pool.pool.connect();
  try {
    await client.query('BEGIN');

    // Update user's password_hash
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, tokenValidation.userId]
    );

    // Mark token as used
    await client.query(
      'UPDATE password_resets SET used = true WHERE token = $1',
      [tokenHash]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createResetToken,
  validateResetToken,
  resetPassword,
};

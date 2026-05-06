/**
 * Password Validator Utility
 *
 * Validates passwords against security requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 */

/**
 * Validates a password against security criteria.
 * @param {string} password - The password to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result with specific error messages
 */
function validate(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = { validate };

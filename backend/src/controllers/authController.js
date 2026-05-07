const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const invitationService = require('../services/invitationService');
const passwordResetService = require('../services/passwordResetService');
const passwordValidator = require('../utils/passwordValidator');

exports.register = async (req, res) => {
  const { full_name, email, password, role_id } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (full_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role_id',
      [full_name, email, hashedPassword, role_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'User registration failed' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];

    // Check if user is deactivated — return same error as wrong password to prevent info leak
    if (user.is_active === false) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.id, roleId: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role_id: user.role_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.registerInvite = async (req, res) => {
  const { token, password } = req.body;
  try {
    // 1. Validate the invitation token
    const validation = await invitationService.validateToken(token);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // 2. Validate password
    const passwordValidation = passwordValidator.validate(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: 'Password validation failed', details: passwordValidation.errors });
    }

    // 3. Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create user with email and full_name from invitation, role_id from invitation
    const userResult = await db.query(
      'INSERT INTO users (email, full_name, password_hash, role_id, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role_id',
      [validation.email, validation.fullName, hashedPassword, validation.roleId, true]
    );
    const user = userResult.rows[0];

    // 5. Mark invitation token as used
    await invitationService.markTokenUsed(token);

    // 6. Generate JWT and return
    const jwtToken = jwt.sign(
      { userId: user.id, roleId: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token: jwtToken, user: { id: user.id, full_name: user.full_name, email: user.email, role_id: user.role_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    await passwordResetService.createResetToken(email);
    // Always return generic success message to prevent email enumeration
    res.status(200).json({ message: 'If an account exists with that email, a password reset link has been sent.' });
  } catch (err) {
    console.error(err);
    // Still return generic success to prevent enumeration
    res.status(200).json({ message: 'If an account exists with that email, a password reset link has been sent.' });
  }
};

exports.validateResetToken = async (req, res) => {
  const { token } = req.params;
  try {
    const result = await passwordResetService.validateResetToken(token);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Token validation failed' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    await passwordResetService.resetPassword(token, password);
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    // Handle specific error types
    if (err.message === 'Password validation failed') {
      return res.status(400).json({ error: err.message, details: err.details });
    }
    if (err.message === 'Token invalid' || err.message === 'Token expired' || err.message === 'Token already used') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Password reset failed' });
  }
};

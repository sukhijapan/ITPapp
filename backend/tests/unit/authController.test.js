const authController = require('../../src/controllers/authController');

// Mock dependencies
jest.mock('../../src/db');
jest.mock('../../src/services/invitationService');
jest.mock('../../src/services/passwordResetService');
jest.mock('../../src/utils/passwordValidator');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const db = require('../../src/db');
const invitationService = require('../../src/services/invitationService');
const passwordResetService = require('../../src/services/passwordResetService');
const passwordValidator = require('../../src/utils/passwordValidator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('authController', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login - is_active check', () => {
    it('should reject deactivated users with generic error', async () => {
      req.body = { email: 'user@test.com', password: 'Password1' };
      db.query.mockResolvedValue({
        rows: [{ id: 1, email: 'user@test.com', password_hash: 'hash', is_active: false, role_id: 1 }],
      });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should allow active users to login', async () => {
      req.body = { email: 'user@test.com', password: 'Password1' };
      db.query.mockResolvedValue({
        rows: [{ id: 1, email: 'user@test.com', username: 'user', password_hash: 'hash', is_active: true, role_id: 1 }],
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('jwt-token');

      await authController.login(req, res);

      expect(res.json).toHaveBeenCalledWith({
        token: 'jwt-token',
        user: { id: 1, username: 'user', email: 'user@test.com', role_id: 1 },
      });
    });

    it('should reject wrong password for active users', async () => {
      req.body = { email: 'user@test.com', password: 'wrong' };
      db.query.mockResolvedValue({
        rows: [{ id: 1, email: 'user@test.com', password_hash: 'hash', is_active: true, role_id: 1 }],
      });
      bcrypt.compare.mockResolvedValue(false);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });
  });

  describe('registerInvite', () => {
    it('should reject invalid invitation token', async () => {
      req.body = { token: 'bad-token', username: 'user', password: 'Password1' };
      invitationService.validateToken.mockResolvedValue({ valid: false, error: 'Token invalid' });

      await authController.registerInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token invalid' });
    });

    it('should reject weak password', async () => {
      req.body = { token: 'valid-token', username: 'user', password: 'weak' };
      invitationService.validateToken.mockResolvedValue({ valid: true, email: 'user@test.com', roleId: 2 });
      passwordValidator.validate.mockReturnValue({ valid: false, errors: ['Password must be at least 8 characters long'] });

      await authController.registerInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Password validation failed',
        details: ['Password must be at least 8 characters long'],
      });
    });

    it('should create user and return JWT on success', async () => {
      req.body = { token: 'valid-token', username: 'newuser', password: 'Password1' };
      invitationService.validateToken.mockResolvedValue({ valid: true, email: 'new@test.com', roleId: 3 });
      passwordValidator.validate.mockReturnValue({ valid: true, errors: [] });
      bcrypt.hash.mockResolvedValue('hashed-password');
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 5, username: 'newuser', email: 'new@test.com', role_id: 3 }] }) // INSERT user
        .mockResolvedValueOnce({ rows: [] }); // UPDATE invitations
      jwt.sign.mockReturnValue('new-jwt');

      await authController.registerInvite(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password1', 10);
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, username, password_hash, role_id, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role_id',
        ['new@test.com', 'newuser', 'hashed-password', 3, true]
      );
      expect(db.query).toHaveBeenCalledWith(
        "UPDATE invitations SET status = 'used' WHERE token = $1",
        ['valid-token']
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        token: 'new-jwt',
        user: { id: 5, username: 'newuser', email: 'new@test.com', role_id: 3 },
      });
    });
  });

  describe('forgotPassword', () => {
    it('should always return generic success message', async () => {
      req.body = { email: 'user@test.com' };
      passwordResetService.createResetToken.mockResolvedValue();

      await authController.forgotPassword(req, res);

      expect(passwordResetService.createResetToken).toHaveBeenCalledWith('user@test.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    });

    it('should return generic success even on error', async () => {
      req.body = { email: 'user@test.com' };
      passwordResetService.createResetToken.mockRejectedValue(new Error('DB error'));

      await authController.forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    });
  });

  describe('validateResetToken', () => {
    it('should return validation result', async () => {
      req.params = { token: 'reset-token' };
      passwordResetService.validateResetToken.mockResolvedValue({ valid: true, userId: 1 });

      await authController.validateResetToken(req, res);

      expect(res.json).toHaveBeenCalledWith({ valid: true, userId: 1 });
    });

    it('should return invalid result for bad token', async () => {
      req.params = { token: 'bad-token' };
      passwordResetService.validateResetToken.mockResolvedValue({ valid: false, error: 'Token expired' });

      await authController.validateResetToken(req, res);

      expect(res.json).toHaveBeenCalledWith({ valid: false, error: 'Token expired' });
    });
  });

  describe('resetPassword', () => {
    it('should return success on valid reset', async () => {
      req.body = { token: 'reset-token', password: 'NewPassword1' };
      passwordResetService.resetPassword.mockResolvedValue();

      await authController.resetPassword(req, res);

      expect(passwordResetService.resetPassword).toHaveBeenCalledWith('reset-token', 'NewPassword1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Password reset successful' });
    });

    it('should return 400 for password validation failure', async () => {
      req.body = { token: 'reset-token', password: 'weak' };
      const err = new Error('Password validation failed');
      err.details = ['Password must be at least 8 characters long'];
      passwordResetService.resetPassword.mockRejectedValue(err);

      await authController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Password validation failed',
        details: ['Password must be at least 8 characters long'],
      });
    });

    it('should return 400 for invalid token', async () => {
      req.body = { token: 'bad-token', password: 'Password1' };
      passwordResetService.resetPassword.mockRejectedValue(new Error('Token invalid'));

      await authController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token invalid' });
    });

    it('should return 400 for expired token', async () => {
      req.body = { token: 'expired-token', password: 'Password1' };
      passwordResetService.resetPassword.mockRejectedValue(new Error('Token expired'));

      await authController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
    });

    it('should return 400 for already used token', async () => {
      req.body = { token: 'used-token', password: 'Password1' };
      passwordResetService.resetPassword.mockRejectedValue(new Error('Token already used'));

      await authController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token already used' });
    });
  });
});

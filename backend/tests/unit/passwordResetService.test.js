const crypto = require('crypto');

// Mock dependencies before requiring the module
jest.mock('../../src/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock('../../src/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('fakesalt'),
  hash: jest.fn().mockResolvedValue('$2a$10$hashedpassword'),
}));

const pool = require('../../src/db');
const emailService = require('../../src/services/emailService');
const bcrypt = require('bcryptjs');
const passwordResetService = require('../../src/services/passwordResetService');

describe('passwordResetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createResetToken', () => {
    it('should silently succeed when email does not exist (no enumeration)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // user not found

      // Should not throw
      await passwordResetService.createResetToken('nonexistent@test.com');

      // Should not attempt to insert token or send email
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should create token and send email when user exists', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 5, email: 'user@test.com' }] }) // user found
        .mockResolvedValueOnce({ rows: [] }); // insert token

      emailService.sendPasswordResetEmail.mockResolvedValueOnce();

      await passwordResetService.createResetToken('user@test.com');

      // Verify token was inserted
      expect(pool.query).toHaveBeenCalledTimes(2);
      const insertCall = pool.query.mock.calls[1];
      expect(insertCall[0]).toContain('INSERT INTO password_resets');
      expect(insertCall[1][0]).toBe(5); // user_id
      expect(insertCall[1][1]).toHaveLength(64); // hex token (32 bytes = 64 hex chars)

      // Verify expiry is 1 hour from creation
      const createdAt = insertCall[1][2];
      const expiresAt = insertCall[1][3];
      const diffMs = expiresAt.getTime() - createdAt.getTime();
      expect(diffMs).toBe(60 * 60 * 1000); // exactly 1 hour

      // Verify email was sent
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@test.com',
        expect.any(String)
      );
    });

    it('should succeed even if email delivery fails', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 5, email: 'user@test.com' }] }) // user found
        .mockResolvedValueOnce({ rows: [] }); // insert token

      emailService.sendPasswordResetEmail.mockRejectedValueOnce(new Error('SMTP error'));

      // Should not throw
      await passwordResetService.createResetToken('user@test.com');

      // Token was still inserted
      expect(pool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateResetToken', () => {
    it('should return invalid for non-existent token', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await passwordResetService.validateResetToken('nonexistent');
      expect(result).toEqual({ valid: false, error: 'Token invalid' });
    });

    it('should return invalid for used token', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 5, used: true, expires_at: new Date(Date.now() + 100000) }],
      });

      const result = await passwordResetService.validateResetToken('usedtoken');
      expect(result).toEqual({ valid: false, error: 'Token already used' });
    });

    it('should return invalid for expired token', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 5, used: false, expires_at: new Date(Date.now() - 100000) }],
      });

      const result = await passwordResetService.validateResetToken('expiredtoken');
      expect(result).toEqual({ valid: false, error: 'Token expired' });
    });

    it('should return valid with userId for valid token', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 5, used: false, expires_at: new Date(Date.now() + 100000) }],
      });

      const result = await passwordResetService.validateResetToken('validtoken');
      expect(result).toEqual({ valid: true, userId: 5 });
    });
  });

  describe('resetPassword', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.pool.connect.mockResolvedValue(mockClient);
    });

    it('should throw if new password fails validation', async () => {
      await expect(
        passwordResetService.resetPassword('sometoken', 'weak')
      ).rejects.toThrow('Password validation failed');

      // Should not attempt to validate token or update DB
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should throw if token is invalid', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // token not found

      await expect(
        passwordResetService.resetPassword('badtoken', 'ValidPass1')
      ).rejects.toThrow('Token invalid');
    });

    it('should throw if token is expired', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 5, used: false, expires_at: new Date(Date.now() - 100000) }],
      });

      await expect(
        passwordResetService.resetPassword('expiredtoken', 'ValidPass1')
      ).rejects.toThrow('Token expired');
    });

    it('should update password and mark token as used for valid request', async () => {
      // validateResetToken query
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 5, used: false, expires_at: new Date(Date.now() + 100000) }],
      });

      // Transaction queries
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE users
        .mockResolvedValueOnce({}) // UPDATE password_resets
        .mockResolvedValueOnce({}); // COMMIT

      await passwordResetService.resetPassword('validtoken', 'NewPass123');

      // Verify bcrypt was called
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123', 'fakesalt');

      // Verify transaction
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET password_hash'),
        ['$2a$10$hashedpassword', 5]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE password_resets SET used = true'),
        ['validtoken']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      // validateResetToken query
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 5, used: false, expires_at: new Date(Date.now() + 100000) }],
      });

      // Transaction queries - fail on UPDATE users
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // UPDATE users fails

      await expect(
        passwordResetService.resetPassword('validtoken', 'NewPass123')
      ).rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});

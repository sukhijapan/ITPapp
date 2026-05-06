const crypto = require('crypto');

// Mock dependencies before requiring the module
jest.mock('../../src/db', () => ({
  query: jest.fn(),
}));

jest.mock('../../src/services/emailService', () => ({
  sendInvitationEmail: jest.fn(),
}));

const pool = require('../../src/db');
const emailService = require('../../src/services/emailService');
const invitationService = require('../../src/services/invitationService');

describe('invitationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    it('should reject if email already exists in users table', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // user exists

      await expect(
        invitationService.createInvitation('existing@test.com', 1, 1)
      ).rejects.toThrow('Email already registered');
    });

    it('should reject if role_id does not exist', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // no existing user
        .mockResolvedValueOnce({ rows: [] }); // no role found

      await expect(
        invitationService.createInvitation('new@test.com', 999, 1)
      ).rejects.toThrow('Invalid role');
    });

    it('should invalidate pending invitations for same email before creating new one', async () => {
      const fakeInvitation = {
        id: 1,
        email: 'new@test.com',
        role_id: 2,
        token: 'abc123',
        invited_by: 1,
        status: 'pending',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] }) // no existing user
        .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Head Contractor' }] }) // role exists
        .mockResolvedValueOnce({ rows: [{ username: 'admin', email: 'admin@test.com' }] }) // inviter username
        .mockResolvedValueOnce({ rows: [] }) // invalidate pending
        .mockResolvedValueOnce({ rows: [fakeInvitation] }); // insert

      emailService.sendInvitationEmail.mockResolvedValueOnce();

      const result = await invitationService.createInvitation('new@test.com', 2, 1);

      // Verify invalidation query was called
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'invalidated'"),
        ['new@test.com']
      );
      expect(result).toEqual(fakeInvitation);
    });

    it('should create invitation with 72-hour expiry', async () => {
      const fakeInvitation = {
        id: 1,
        email: 'new@test.com',
        role_id: 2,
        token: 'abc123',
        invited_by: 1,
        status: 'pending',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] }) // no existing user
        .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Head Contractor' }] }) // role exists
        .mockResolvedValueOnce({ rows: [{ username: 'admin', email: 'admin@test.com' }] }) // inviter username
        .mockResolvedValueOnce({ rows: [] }) // invalidate pending
        .mockResolvedValueOnce({ rows: [fakeInvitation] }); // insert

      emailService.sendInvitationEmail.mockResolvedValueOnce();

      await invitationService.createInvitation('new@test.com', 2, 1);

      // Verify the INSERT query was called with correct expiry
      const insertCall = pool.query.mock.calls[4];
      const createdAt = insertCall[1][4];
      const expiresAt = insertCall[1][5];
      const diffHours = (expiresAt - createdAt) / (1000 * 60 * 60);
      expect(diffHours).toBe(72);
    });

    it('should persist invitation even if email delivery fails', async () => {
      const fakeInvitation = {
        id: 1,
        email: 'new@test.com',
        role_id: 2,
        token: 'abc123',
        invited_by: 1,
        status: 'pending',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] }) // no existing user
        .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Head Contractor' }] }) // role exists
        .mockResolvedValueOnce({ rows: [{ username: 'admin', email: 'admin@test.com' }] }) // inviter username
        .mockResolvedValueOnce({ rows: [] }) // invalidate pending
        .mockResolvedValueOnce({ rows: [fakeInvitation] }); // insert

      emailService.sendInvitationEmail.mockRejectedValueOnce(new Error('SMTP error'));

      // Should NOT throw even though email failed
      const result = await invitationService.createInvitation('new@test.com', 2, 1);
      expect(result).toEqual(fakeInvitation);
    });

    it('should send invitation email with correct parameters', async () => {
      const fakeInvitation = {
        id: 1,
        email: 'new@test.com',
        role_id: 2,
        token: 'generatedtoken',
        invited_by: 1,
        status: 'pending',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] }) // no existing user
        .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Admin' }] }) // role exists
        .mockResolvedValueOnce({ rows: [{ username: 'testadmin', email: 'testadmin@test.com' }] }) // inviter username
        .mockResolvedValueOnce({ rows: [] }) // invalidate pending
        .mockResolvedValueOnce({ rows: [fakeInvitation] }); // insert

      emailService.sendInvitationEmail.mockResolvedValueOnce();

      await invitationService.createInvitation('new@test.com', 2, 1);

      expect(emailService.sendInvitationEmail).toHaveBeenCalledWith(
        'new@test.com',
        expect.any(String), // token (generated by crypto)
        'Admin',
        'testadmin',
        expect.any(String) // inviter email
      );
    });
  });

  describe('validateToken', () => {
    it('should return invalid for non-existent token', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await invitationService.validateToken('nonexistent');
      expect(result).toEqual({ valid: false, error: 'Token invalid' });
    });

    it('should return invalid for used token', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ token: 'abc', status: 'used', expires_at: new Date(Date.now() + 100000) }],
      });

      const result = await invitationService.validateToken('abc');
      expect(result).toEqual({ valid: false, error: 'Token already used' });
    });

    it('should return invalid for invalidated token', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ token: 'abc', status: 'invalidated', expires_at: new Date(Date.now() + 100000) }],
      });

      const result = await invitationService.validateToken('abc');
      expect(result).toEqual({ valid: false, error: 'Token invalid' });
    });

    it('should return expired for pending but expired token', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ token: 'abc', status: 'pending', expires_at: new Date(Date.now() - 100000) }],
      });

      const result = await invitationService.validateToken('abc');
      expect(result).toEqual({ valid: false, error: 'Token expired' });
    });

    it('should return valid with email and roleId for valid pending token', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          token: 'abc',
          status: 'pending',
          email: 'user@test.com',
          role_id: 3,
          expires_at: new Date(Date.now() + 100000),
        }],
      });

      const result = await invitationService.validateToken('abc');
      expect(result).toEqual({ valid: true, email: 'user@test.com', roleId: 3 });
    });
  });

  describe('invalidateToken', () => {
    it('should set token status to invalidated', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await invitationService.invalidateToken('sometoken');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'invalidated'"),
        ['sometoken']
      );
    });
  });

  describe('getPendingInvitations', () => {
    it('should return all pending invitations with role names', async () => {
      const pending = [
        { id: 1, email: 'a@test.com', status: 'pending', role_name: 'Admin' },
        { id: 2, email: 'b@test.com', status: 'pending', role_name: 'Client' },
      ];
      pool.query.mockResolvedValueOnce({ rows: pending });

      const result = await invitationService.getPendingInvitations();
      expect(result).toEqual(pending);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'pending'")
      );
    });
  });

  describe('resendInvitation', () => {
    it('should throw if invitation not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        invitationService.resendInvitation(999, 1)
      ).rejects.toThrow('Invitation not found');
    });

    it('should invalidate old invitation and create new one', async () => {
      const oldInvitation = {
        id: 5,
        email: 'resend@test.com',
        role_id: 3,
        token: 'oldtoken',
        invited_by: 1,
        status: 'pending',
      };

      const newInvitation = {
        id: 6,
        email: 'resend@test.com',
        role_id: 3,
        token: 'newtoken',
        invited_by: 2,
        status: 'pending',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000),
      };

      pool.query
        .mockResolvedValueOnce({ rows: [oldInvitation] }) // fetch existing
        .mockResolvedValueOnce({ rows: [] }) // invalidate old by id
        // createInvitation calls:
        .mockResolvedValueOnce({ rows: [] }) // no existing user
        .mockResolvedValueOnce({ rows: [{ id: 3, name: 'Client' }] }) // role exists
        .mockResolvedValueOnce({ rows: [{ username: 'admin2', email: 'admin2@test.com' }] }) // inviter username
        .mockResolvedValueOnce({ rows: [] }) // invalidate pending for email
        .mockResolvedValueOnce({ rows: [newInvitation] }); // insert new

      emailService.sendInvitationEmail.mockResolvedValueOnce();

      const result = await invitationService.resendInvitation(5, 2);

      // Verify old invitation was invalidated
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'invalidated'"),
        [5]
      );
      expect(result).toEqual(newInvitation);
    });
  });
});

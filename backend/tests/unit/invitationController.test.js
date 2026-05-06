jest.mock('../../src/services/invitationService', () => ({
  createInvitation: jest.fn(),
  validateToken: jest.fn(),
  getPendingInvitations: jest.fn(),
  resendInvitation: jest.fn(),
}));

const invitationService = require('../../src/services/invitationService');
const invitationController = require('../../src/controllers/invitationController');

function mockReq(overrides = {}) {
  return {
    body: {},
    params: {},
    user: { userId: 1, roleId: 4 },
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('invitationController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    it('should return 400 if email is missing', async () => {
      const req = mockReq({ body: { role_id: 2 } });
      const res = mockRes();

      await invitationController.createInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email and role_id are required' });
    });

    it('should return 400 if role_id is missing', async () => {
      const req = mockReq({ body: { email: 'test@example.com' } });
      const res = mockRes();

      await invitationController.createInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email and role_id are required' });
    });

    it('should return 201 with invitation on success', async () => {
      const invitation = { id: 1, email: 'new@test.com', role_id: 2, status: 'pending' };
      invitationService.createInvitation.mockResolvedValue(invitation);

      const req = mockReq({ body: { email: 'new@test.com', role_id: 2 } });
      const res = mockRes();

      await invitationController.createInvitation(req, res);

      expect(invitationService.createInvitation).toHaveBeenCalledWith('new@test.com', 2, 1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(invitation);
    });

    it('should return 409 when email already registered', async () => {
      invitationService.createInvitation.mockRejectedValue(new Error('Email already registered'));

      const req = mockReq({ body: { email: 'existing@test.com', role_id: 2 } });
      const res = mockRes();

      await invitationController.createInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' });
    });

    it('should return 400 when role is invalid', async () => {
      invitationService.createInvitation.mockRejectedValue(new Error('Invalid role'));

      const req = mockReq({ body: { email: 'new@test.com', role_id: 999 } });
      const res = mockRes();

      await invitationController.createInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid role' });
    });

    it('should return 500 on unexpected errors', async () => {
      invitationService.createInvitation.mockRejectedValue(new Error('DB connection lost'));

      const req = mockReq({ body: { email: 'new@test.com', role_id: 2 } });
      const res = mockRes();

      await invitationController.createInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('validateToken', () => {
    it('should return 200 with validation result for valid token', async () => {
      const result = { valid: true, email: 'user@test.com', roleId: 3 };
      invitationService.validateToken.mockResolvedValue(result);

      const req = mockReq({ params: { token: 'validtoken123' } });
      const res = mockRes();

      await invitationController.validateToken(req, res);

      expect(invitationService.validateToken).toHaveBeenCalledWith('validtoken123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('should return 200 with error info for invalid token (frontend handles display)', async () => {
      const result = { valid: false, error: 'Token expired' };
      invitationService.validateToken.mockResolvedValue(result);

      const req = mockReq({ params: { token: 'expiredtoken' } });
      const res = mockRes();

      await invitationController.validateToken(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('should return 500 on unexpected errors', async () => {
      invitationService.validateToken.mockRejectedValue(new Error('DB error'));

      const req = mockReq({ params: { token: 'sometoken' } });
      const res = mockRes();

      await invitationController.validateToken(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('getPendingInvitations', () => {
    it('should return 200 with list of pending invitations', async () => {
      const invitations = [
        { id: 1, email: 'a@test.com', role_name: 'Admin' },
        { id: 2, email: 'b@test.com', role_name: 'Client' },
      ];
      invitationService.getPendingInvitations.mockResolvedValue(invitations);

      const req = mockReq();
      const res = mockRes();

      await invitationController.getPendingInvitations(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(invitations);
    });

    it('should return 500 on unexpected errors', async () => {
      invitationService.getPendingInvitations.mockRejectedValue(new Error('DB error'));

      const req = mockReq();
      const res = mockRes();

      await invitationController.getPendingInvitations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('resendInvitation', () => {
    it('should return 201 with new invitation on success', async () => {
      const newInvitation = { id: 6, email: 'resend@test.com', status: 'pending' };
      invitationService.resendInvitation.mockResolvedValue(newInvitation);

      const req = mockReq({ params: { id: '5' } });
      const res = mockRes();

      await invitationController.resendInvitation(req, res);

      expect(invitationService.resendInvitation).toHaveBeenCalledWith(5, 1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newInvitation);
    });

    it('should return 404 when invitation not found', async () => {
      invitationService.resendInvitation.mockRejectedValue(new Error('Invitation not found'));

      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();

      await invitationController.resendInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invitation not found' });
    });

    it('should return 409 when email already registered on resend', async () => {
      invitationService.resendInvitation.mockRejectedValue(new Error('Email already registered'));

      const req = mockReq({ params: { id: '5' } });
      const res = mockRes();

      await invitationController.resendInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' });
    });

    it('should return 400 when role is invalid on resend', async () => {
      invitationService.resendInvitation.mockRejectedValue(new Error('Invalid role'));

      const req = mockReq({ params: { id: '5' } });
      const res = mockRes();

      await invitationController.resendInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid role' });
    });

    it('should return 500 on unexpected errors', async () => {
      invitationService.resendInvitation.mockRejectedValue(new Error('DB error'));

      const req = mockReq({ params: { id: '5' } });
      const res = mockRes();

      await invitationController.resendInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});

jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn((params) => params),
    __mockSend: mockSend,
  };
});

describe('emailService', () => {
  let emailService;
  let mockSend;

  beforeEach(() => {
    jest.resetModules();
    process.env.NOTIFICATION_BUCKET = 'test-bucket';
    process.env.APP_URL = 'https://app.example.com';
    process.env.SES_FROM_EMAIL = 'noreply@test.com';

    const s3Module = require('@aws-sdk/client-s3');
    mockSend = s3Module.__mockSend;
    mockSend.mockClear();

    emailService = require('../../src/services/emailService');
  });

  afterEach(() => {
    delete process.env.NOTIFICATION_BUCKET;
    delete process.env.APP_URL;
    delete process.env.SES_FROM_EMAIL;
  });

  describe('sendInvitationEmail', () => {
    it('should write invitation JSON to S3 with correct content', async () => {
      await emailService.sendInvitationEmail('user@example.com', 'abc123token', 'Admin');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const params = mockSend.mock.calls[0][0];

      expect(params.Bucket).toBe('test-bucket');
      expect(params.Key).toMatch(/^email\/invitation-/);
      expect(params.ContentType).toBe('application/json');

      const payload = JSON.parse(params.Body);
      expect(payload.type).toBe('invitation');
      expect(payload.to).toBe('user@example.com');
      expect(payload.subject).toContain('ITP Management System');
      expect(payload.html).toContain('https://app.example.com/register/abc123token');
      expect(payload.html).toContain('Admin');
      expect(payload.text).toContain('https://app.example.com/register/abc123token');
    });

    it('should include the role name in the email body', async () => {
      await emailService.sendInvitationEmail('user@example.com', 'token123', 'Head Contractor');

      const params = mockSend.mock.calls[0][0];
      const payload = JSON.parse(params.Body);
      expect(payload.html).toContain('Head Contractor');
      expect(payload.text).toContain('Head Contractor');
    });

    it('should throw and log error when S3 write fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSend.mockRejectedValueOnce(new Error('S3 write failed'));

      await expect(
        emailService.sendInvitationEmail('user@example.com', 'token', 'Admin')
      ).rejects.toThrow('S3 write failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EmailService] Failed to queue invitation email'),
        expect.any(String)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should write reset JSON to S3 with correct content', async () => {
      await emailService.sendPasswordResetEmail('user@example.com', 'resettoken456');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const params = mockSend.mock.calls[0][0];

      expect(params.Bucket).toBe('test-bucket');
      expect(params.Key).toMatch(/^email\/reset-/);

      const payload = JSON.parse(params.Body);
      expect(payload.type).toBe('password_reset');
      expect(payload.to).toBe('user@example.com');
      expect(payload.subject).toContain('ITP Management System');
      expect(payload.subject).toContain('Password Reset');
      expect(payload.html).toContain('https://app.example.com/reset-password/resettoken456');
      expect(payload.text).toContain('https://app.example.com/reset-password/resettoken456');
    });

    it('should include expiry information in the email', async () => {
      await emailService.sendPasswordResetEmail('user@example.com', 'token');

      const params = mockSend.mock.calls[0][0];
      const payload = JSON.parse(params.Body);
      expect(payload.html).toContain('1 hour');
      expect(payload.text).toContain('1 hour');
    });

    it('should throw and log error when S3 write fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(
        emailService.sendPasswordResetEmail('user@example.com', 'token')
      ).rejects.toThrow('Connection timeout');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EmailService] Failed to queue password reset email'),
        expect.any(String)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('missing NOTIFICATION_BUCKET', () => {
    it('should skip sending when NOTIFICATION_BUCKET is not set', async () => {
      delete process.env.NOTIFICATION_BUCKET;
      jest.resetModules();
      const freshService = require('../../src/services/emailService');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await freshService.sendInvitationEmail('user@example.com', 'token', 'Admin');

      expect(mockSend).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('NOTIFICATION_BUCKET not set')
      );
      consoleSpy.mockRestore();
    });
  });
});

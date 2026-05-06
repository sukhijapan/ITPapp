// Mock dependencies before requiring the module
jest.mock('../../src/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock('../../src/services/witnessPointConfigService', () => ({
  getProjectConfig: jest.fn(),
  getDefaultRecipients: jest.fn(),
}));

const mockS3Send = jest.fn().mockResolvedValue({});

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn((params) => params),
}));

jest.mock('../../src/services/witnessPointTimerService', () => ({
  cancelTimer: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });

const db = require('../../src/db');
const witnessPointService = require('../../src/services/witnessPointService');

describe('witnessPointService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotificationByPoint', () => {
    it('should return null when no notification exists for the point', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await witnessPointService.getNotificationByPoint(999);

      expect(result).toBeNull();
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('itp_point_id'),
        [999]
      );
    });

    it('should return the notification with recipients when one exists', async () => {
      const fakeNotification = {
        id: 1,
        itp_point_id: 42,
        status: 'Pending',
        planned_inspection_time: '2025-01-20T10:00:00Z',
        creator_name: 'John Doe',
        creator_email: 'john@example.com',
      };

      const fakeRecipients = [
        {
          id: 1,
          notification_id: 1,
          email: 'super@example.com',
          recipient_name: 'Superintendent',
          is_external: false,
          token: 'abc123',
          token_expires_at: '2025-01-20T10:00:00Z',
          token_used_at: null,
        },
      ];

      db.query
        .mockResolvedValueOnce({ rows: [fakeNotification] }) // notification query
        .mockResolvedValueOnce({ rows: fakeRecipients }); // recipients query

      const result = await witnessPointService.getNotificationByPoint(42);

      expect(result).toEqual({
        ...fakeNotification,
        recipients: fakeRecipients,
      });
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should prefer Pending notification over completed ones', async () => {
      const pendingNotification = {
        id: 2,
        itp_point_id: 42,
        status: 'Pending',
        creator_name: 'John Doe',
        creator_email: 'john@example.com',
      };

      db.query
        .mockResolvedValueOnce({ rows: [pendingNotification] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await witnessPointService.getNotificationByPoint(42);

      expect(result.status).toBe('Pending');
      // Verify the ORDER BY prioritizes Pending
      const queryCall = db.query.mock.calls[0][0];
      expect(queryCall).toContain("CASE WHEN n.status = 'Pending' THEN 0 ELSE 1 END");
    });

    it('should return most recent non-pending notification when no pending exists', async () => {
      const completedNotification = {
        id: 3,
        itp_point_id: 42,
        status: 'Confirmed',
        creator_name: 'Jane Smith',
        creator_email: 'jane@example.com',
      };

      db.query
        .mockResolvedValueOnce({ rows: [completedNotification] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await witnessPointService.getNotificationByPoint(42);

      expect(result.status).toBe('Confirmed');
    });
  });

  describe('getNotificationById', () => {
    it('should return null when notification does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await witnessPointService.getNotificationById(999);

      expect(result).toBeNull();
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('n.id = $1'),
        [999]
      );
    });

    it('should return the notification with full recipient details', async () => {
      const fakeNotification = {
        id: 5,
        itp_point_id: 10,
        status: 'Pending',
        planned_inspection_time: '2025-02-01T14:00:00Z',
        notice_period_hours: 24,
        expiry_time: '2025-01-31T14:00:00Z',
        location_description: 'Building A, Level 2',
        scope_of_work: 'Concrete pour inspection',
        creator_name: 'Bob Builder',
        creator_email: 'bob@example.com',
      };

      const fakeRecipients = [
        {
          id: 10,
          notification_id: 5,
          user_id: 3,
          email: 'super@example.com',
          recipient_name: 'Superintendent',
          is_external: false,
          token: 'token-abc',
          token_expires_at: '2025-02-01T14:00:00Z',
          token_used_at: null,
        },
        {
          id: 11,
          notification_id: 5,
          user_id: null,
          email: 'external@client.com',
          recipient_name: 'Client Rep',
          is_external: true,
          token: 'token-def',
          token_expires_at: '2025-02-01T14:00:00Z',
          token_used_at: null,
        },
      ];

      db.query
        .mockResolvedValueOnce({ rows: [fakeNotification] })
        .mockResolvedValueOnce({ rows: fakeRecipients });

      const result = await witnessPointService.getNotificationById(5);

      expect(result).toEqual({
        ...fakeNotification,
        recipients: fakeRecipients,
      });
      expect(result.recipients).toHaveLength(2);
      expect(result.recipients[0].is_external).toBe(false);
      expect(result.recipients[1].is_external).toBe(true);
    });

    it('should include creator name and email from users JOIN', async () => {
      const fakeNotification = {
        id: 7,
        itp_point_id: 15,
        created_by: 2,
        status: 'Expired',
        creator_name: 'Alice Worker',
        creator_email: 'alice@example.com',
      };

      db.query
        .mockResolvedValueOnce({ rows: [fakeNotification] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await witnessPointService.getNotificationById(7);

      expect(result.creator_name).toBe('Alice Worker');
      expect(result.creator_email).toBe('alice@example.com');
    });

    it('should include token status for each recipient', async () => {
      const fakeNotification = {
        id: 8,
        itp_point_id: 20,
        status: 'Confirmed',
        creator_name: 'Test User',
        creator_email: 'test@example.com',
      };

      const fakeRecipients = [
        {
          id: 15,
          notification_id: 8,
          email: 'responded@example.com',
          recipient_name: 'Responder',
          is_external: false,
          token: 'used-token',
          token_expires_at: '2025-02-01T14:00:00Z',
          token_used_at: '2025-01-31T10:00:00Z',
        },
      ];

      db.query
        .mockResolvedValueOnce({ rows: [fakeNotification] })
        .mockResolvedValueOnce({ rows: fakeRecipients });

      const result = await witnessPointService.getNotificationById(8);

      expect(result.recipients[0].token_used_at).toBe('2025-01-31T10:00:00Z');
    });
  });

  describe('respondViaToken', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      db.pool.connect.mockResolvedValue(mockClient);
    });

    it('should reject an invalid token', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // token lookup returns nothing

      await expect(
        witnessPointService.respondViaToken('invalid-token', { responseType: 'confirm' })
      ).rejects.toThrow('Invalid or expired response link');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject a token that has already been used', async () => {
      const usedToken = {
        id: 1,
        notification_id: 10,
        token: 'used-token',
        expires_at: '2099-01-01T00:00:00Z',
        used_at: '2025-01-15T10:00:00Z', // already used
        recipient_email: 'super@example.com',
        recipient_name: 'Superintendent',
        recipient_user_id: 3,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [usedToken] }); // token lookup

      await expect(
        witnessPointService.respondViaToken('used-token', { responseType: 'confirm' })
      ).rejects.toThrow('This response link has already been used');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject an expired token', async () => {
      const expiredToken = {
        id: 1,
        notification_id: 10,
        token: 'expired-token',
        expires_at: '2020-01-01T00:00:00Z', // in the past
        used_at: null,
        recipient_email: 'super@example.com',
        recipient_name: 'Superintendent',
        recipient_user_id: 3,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [expiredToken] }); // token lookup

      await expect(
        witnessPointService.respondViaToken('expired-token', { responseType: 'confirm' })
      ).rejects.toThrow('This notification has expired. Response is no longer accepted');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject response when notification is no longer pending', async () => {
      const validToken = {
        id: 1,
        notification_id: 10,
        token: 'valid-token',
        expires_at: '2099-01-01T00:00:00Z',
        used_at: null,
        recipient_email: 'super@example.com',
        recipient_name: 'Superintendent',
        recipient_user_id: 3,
      };

      const confirmedNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Confirmed', // already responded
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [validToken] }) // token lookup
        .mockResolvedValueOnce({ rows: [confirmedNotification] }); // notification lookup

      await expect(
        witnessPointService.respondViaToken('valid-token', { responseType: 'confirm' })
      ).rejects.toThrow('This notification has already been responded to or is no longer pending');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should confirm a notification via token successfully', async () => {
      const validToken = {
        id: 1,
        notification_id: 10,
        token: 'valid-token',
        expires_at: '2099-01-01T00:00:00Z',
        used_at: null,
        recipient_email: 'super@example.com',
        recipient_name: 'Superintendent',
        recipient_user_id: 3,
      };

      const pendingNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Pending',
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
      };

      const updatedNotification = {
        ...pendingNotification,
        status: 'Confirmed',
        responded_by: 3,
        responded_at: '2025-01-15T10:00:00Z',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [validToken] }) // token lookup
        .mockResolvedValueOnce({ rows: [pendingNotification] }) // notification lookup
        .mockResolvedValueOnce({ rows: [] }) // mark token as used
        .mockResolvedValueOnce({ rows: [] }) // update notification status
        .mockResolvedValueOnce({ rows: [] }) // audit log insert
        .mockResolvedValueOnce({ rows: [updatedNotification] }) // select updated notification
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await witnessPointService.respondViaToken('valid-token', { responseType: 'confirm' });

      expect(result.status).toBe('Confirmed');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should decline a notification and trigger auto-waiver', async () => {
      const validToken = {
        id: 1,
        notification_id: 10,
        token: 'valid-token',
        expires_at: '2099-01-01T00:00:00Z',
        used_at: null,
        recipient_email: 'super@example.com',
        recipient_name: 'Superintendent',
        recipient_user_id: 3,
      };

      const pendingNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Pending',
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
      };

      const updatedNotification = {
        ...pendingNotification,
        status: 'Declined',
        responded_by: 3,
        response_reason: 'Not available',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [validToken] }) // token lookup
        .mockResolvedValueOnce({ rows: [pendingNotification] }) // notification lookup
        .mockResolvedValueOnce({ rows: [] }) // mark token as used
        .mockResolvedValueOnce({ rows: [] }) // update notification status (decline)
        .mockResolvedValueOnce({ rows: [] }) // insert wp_auto_waivers
        .mockResolvedValueOnce({ rows: [] }) // update itp_points.wp_waiver_status
        .mockResolvedValueOnce({ rows: [] }) // audit log insert
        .mockResolvedValueOnce({ rows: [updatedNotification] }) // select updated notification
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await witnessPointService.respondViaToken('valid-token', {
        responseType: 'decline',
        reason: 'Not available',
      });

      expect(result.status).toBe('Declined');
      // Verify auto-waiver was inserted
      const autoWaiverCall = mockClient.query.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('wp_auto_waivers')
      );
      expect(autoWaiverCall).toBeDefined();
      expect(autoWaiverCall[1][2]).toBeDefined(); // time_elapsed_hours
    });
  });

  describe('respondToNotification', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      db.pool.connect.mockResolvedValue(mockClient);
    });

    it('should reject when notification does not exist', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // notification lookup returns nothing

      await expect(
        witnessPointService.respondToNotification(999, {
          responseType: 'confirm',
          respondentId: 3,
        })
      ).rejects.toThrow('Notification not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject when notification is not pending', async () => {
      const confirmedNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Expired',
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [confirmedNotification] }); // notification lookup

      await expect(
        witnessPointService.respondToNotification(10, {
          responseType: 'confirm',
          respondentId: 3,
        })
      ).rejects.toThrow('This notification has already been responded to or is no longer pending');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject when planned inspection time has passed', async () => {
      const expiredNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Pending',
        planned_inspection_time: '2020-01-01T00:00:00Z', // in the past
        created_at: '2019-12-01T00:00:00Z',
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [expiredNotification] }); // notification lookup

      await expect(
        witnessPointService.respondToNotification(10, {
          responseType: 'confirm',
          respondentId: 3,
        })
      ).rejects.toThrow('This notification has expired. Response is no longer accepted');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should confirm a notification for an authenticated user', async () => {
      const pendingNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Pending',
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
      };

      const respondent = {
        id: 3,
        full_name: 'Superintendent',
        email: 'super@example.com',
      };

      const updatedNotification = {
        ...pendingNotification,
        status: 'Confirmed',
        responded_by: 3,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [pendingNotification] }) // notification lookup
        .mockResolvedValueOnce({ rows: [respondent] }) // respondent lookup
        .mockResolvedValueOnce({ rows: [] }) // mark token as used (for respondent)
        .mockResolvedValueOnce({ rows: [] }) // update notification status
        .mockResolvedValueOnce({ rows: [] }) // audit log insert
        .mockResolvedValueOnce({ rows: [updatedNotification] }) // select updated notification
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await witnessPointService.respondToNotification(10, {
        responseType: 'confirm',
        respondentId: 3,
      });

      expect(result.status).toBe('Confirmed');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle reschedule response and keep status Pending', async () => {
      const pendingNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Pending',
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
      };

      const respondent = {
        id: 3,
        full_name: 'Superintendent',
        email: 'super@example.com',
      };

      const updatedNotification = {
        ...pendingNotification,
        status: 'Pending',
        responded_by: 3,
        requested_reschedule_time: '2099-02-01T10:00:00Z',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [pendingNotification] }) // notification lookup
        .mockResolvedValueOnce({ rows: [respondent] }) // respondent lookup
        .mockResolvedValueOnce({ rows: [] }) // mark token as used
        .mockResolvedValueOnce({ rows: [] }) // update notification (reschedule)
        .mockResolvedValueOnce({ rows: [] }) // audit log insert
        .mockResolvedValueOnce({ rows: [updatedNotification] }) // select updated notification
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await witnessPointService.respondToNotification(10, {
        responseType: 'reschedule',
        respondentId: 3,
        requestedTime: '2099-02-01T10:00:00Z',
      });

      expect(result.status).toBe('Pending');
      expect(result.requested_reschedule_time).toBe('2099-02-01T10:00:00Z');
    });

    it('should reject an invalid response type', async () => {
      const pendingNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Pending',
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
      };

      const respondent = {
        id: 3,
        full_name: 'Superintendent',
        email: 'super@example.com',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [pendingNotification] }) // notification lookup
        .mockResolvedValueOnce({ rows: [respondent] }) // respondent lookup
        .mockResolvedValueOnce({ rows: [] }); // mark token as used

      await expect(
        witnessPointService.respondToNotification(10, {
          responseType: 'invalid',
          respondentId: 3,
        })
      ).rejects.toThrow("Invalid response type: invalid. Must be 'confirm', 'decline', or 'reschedule'");

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('cancelNotification', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      db.pool.connect.mockResolvedValue(mockClient);
    });

    it('should reject when notification does not exist', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // notification lookup returns nothing

      await expect(
        witnessPointService.cancelNotification(999, 1, 'Work postponed')
      ).rejects.toThrow('Notification not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject when notification status is not Pending', async () => {
      const confirmedNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Confirmed',
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_by: 1,
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
        project_name: 'Test Project',
        itp_name: 'Test ITP',
        point_description: 'Test Point',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [confirmedNotification] }); // notification lookup

      await expect(
        witnessPointService.cancelNotification(10, 1, 'Work postponed')
      ).rejects.toThrow('Only pending notifications can be cancelled');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject cancellation of Expired notifications', async () => {
      const expiredNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Expired',
        planned_inspection_time: '2020-01-20T10:00:00Z',
        created_by: 1,
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
        project_name: 'Test Project',
        itp_name: 'Test ITP',
        point_description: 'Test Point',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [expiredNotification] }); // notification lookup

      await expect(
        witnessPointService.cancelNotification(10, 1, 'Work postponed')
      ).rejects.toThrow('Only pending notifications can be cancelled');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should successfully cancel a pending notification', async () => {
      const pendingNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Pending',
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_by: 1,
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
        project_name: 'Test Project',
        itp_name: 'Test ITP',
        point_description: 'Concrete pour inspection',
      };

      const recipients = [
        { id: 1, notification_id: 10, email: 'super@example.com', recipient_name: 'Superintendent', is_external: false },
        { id: 2, notification_id: 10, email: 'external@client.com', recipient_name: 'Client Rep', is_external: true },
      ];

      const cancelledNotification = {
        ...pendingNotification,
        status: 'Cancelled',
        cancelled_by: 1,
        cancelled_at: expect.any(String),
        cancellation_reason: 'Work postponed',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [pendingNotification] }) // notification lookup
        .mockResolvedValueOnce({ rows: [] }) // UPDATE status to Cancelled
        .mockResolvedValueOnce({ rows: recipients }) // SELECT recipients
        .mockResolvedValueOnce({ rows: [] }) // audit log insert
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [cancelledNotification] }); // SELECT updated notification

      // The query mock needs to handle the final SELECT after COMMIT
      // Reorder: BEGIN, notification lookup, UPDATE, recipients, audit, COMMIT, final SELECT
      mockClient.query.mockReset();
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [pendingNotification] }) // notification lookup
        .mockResolvedValueOnce({ rows: [] }) // UPDATE status to Cancelled
        .mockResolvedValueOnce({ rows: recipients }) // SELECT recipients
        .mockResolvedValueOnce({ rows: [] }) // audit log insert
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [cancelledNotification] }); // SELECT updated notification

      const result = await witnessPointService.cancelNotification(10, 1, 'Work postponed');

      expect(result.status).toBe('Cancelled');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should attempt to send cancellation emails to all recipients', async () => {
      // Note: NOTIFICATION_BUCKET is captured at module load time, so we verify
      // the function iterates over all recipients (the email queueing gracefully
      // skips when bucket is not configured)
      const pendingNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Pending',
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_by: 1,
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
        project_name: 'Test Project',
        itp_name: 'Test ITP',
        point_description: 'Concrete pour inspection',
      };

      const recipients = [
        { id: 1, notification_id: 10, email: 'super@example.com', recipient_name: 'Superintendent', is_external: false },
        { id: 2, notification_id: 10, email: 'external@client.com', recipient_name: 'Client Rep', is_external: true },
      ];

      const cancelledNotification = {
        ...pendingNotification,
        status: 'Cancelled',
        cancelled_by: 1,
        cancellation_reason: 'Weather delay',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [pendingNotification] }) // notification lookup
        .mockResolvedValueOnce({ rows: [] }) // UPDATE status to Cancelled
        .mockResolvedValueOnce({ rows: recipients }) // SELECT recipients
        .mockResolvedValueOnce({ rows: [] }) // audit log insert
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [cancelledNotification] }); // SELECT updated notification

      const result = await witnessPointService.cancelNotification(10, 1, 'Weather delay');

      // Verify the recipients were fetched for email dispatch
      const recipientQuery = mockClient.query.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('wp_notification_recipients') && call[0].includes('notification_id')
      );
      expect(recipientQuery).toBeDefined();
      expect(recipientQuery[1]).toEqual([10]);

      // Verify cancellation completed successfully
      expect(result.status).toBe('Cancelled');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should create an audit log entry for cancellation', async () => {
      const pendingNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Pending',
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_by: 1,
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
        project_name: 'Test Project',
        itp_name: 'Test ITP',
        point_description: 'Test Point',
      };

      const recipients = [];

      const cancelledNotification = {
        ...pendingNotification,
        status: 'Cancelled',
        cancelled_by: 1,
        cancellation_reason: 'Postponed',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [pendingNotification] }) // notification lookup
        .mockResolvedValueOnce({ rows: [] }) // UPDATE status to Cancelled
        .mockResolvedValueOnce({ rows: recipients }) // SELECT recipients (empty)
        .mockResolvedValueOnce({ rows: [] }) // audit log insert
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [cancelledNotification] }); // SELECT updated notification

      await witnessPointService.cancelNotification(10, 1, 'Postponed');

      // Find the audit log insert call
      const auditCall = mockClient.query.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('audit_logs') && call[0].includes('WP_NOTIFICATION_CANCELLED')
      );
      expect(auditCall).toBeDefined();
      expect(auditCall[1][0]).toBe(5); // itp_instance_id
      expect(auditCall[1][1]).toBe(42); // itp_point_id
      expect(auditCall[1][2]).toBe(1); // user_id

      const metadata = JSON.parse(auditCall[1][3]);
      expect(metadata.notification_id).toBe(10);
      expect(metadata.previous_status).toBe('Pending');
      expect(metadata.new_status).toBe('Cancelled');
      expect(metadata.cancellation_reason).toBe('Postponed');
    });

    it('should handle timer service failure gracefully', async () => {
      // Mock the timer service to throw an error
      const witnessPointTimerService = require('../../src/services/witnessPointTimerService');
      witnessPointTimerService.cancelTimer.mockRejectedValueOnce(new Error('Schedule not found'));

      const pendingNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Pending',
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_by: 1,
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
        project_name: 'Test Project',
        itp_name: 'Test ITP',
        point_description: 'Test Point',
      };

      const cancelledNotification = {
        ...pendingNotification,
        status: 'Cancelled',
        cancelled_by: 1,
        cancellation_reason: 'Postponed',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [pendingNotification] }) // notification lookup
        .mockResolvedValueOnce({ rows: [] }) // UPDATE status to Cancelled
        .mockResolvedValueOnce({ rows: [] }) // SELECT recipients (empty)
        .mockResolvedValueOnce({ rows: [] }) // audit log insert
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [cancelledNotification] }); // SELECT updated notification

      // Should NOT throw even though timer service fails
      const result = await witnessPointService.cancelNotification(10, 1, 'Postponed');

      expect(result.status).toBe('Cancelled');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle null cancellation reason', async () => {
      const pendingNotification = {
        id: 10,
        itp_point_id: 42,
        itp_instance_id: 5,
        status: 'Pending',
        planned_inspection_time: '2099-01-20T10:00:00Z',
        created_by: 1,
        creator_name: 'Creator',
        creator_email: 'creator@example.com',
        project_name: 'Test Project',
        itp_name: 'Test ITP',
        point_description: 'Test Point',
      };

      const cancelledNotification = {
        ...pendingNotification,
        status: 'Cancelled',
        cancelled_by: 1,
        cancellation_reason: null,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [pendingNotification] }) // notification lookup
        .mockResolvedValueOnce({ rows: [] }) // UPDATE status to Cancelled
        .mockResolvedValueOnce({ rows: [] }) // SELECT recipients (empty)
        .mockResolvedValueOnce({ rows: [] }) // audit log insert
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [cancelledNotification] }); // SELECT updated notification

      const result = await witnessPointService.cancelNotification(10, 1, null);

      expect(result.status).toBe('Cancelled');
      expect(result.cancellation_reason).toBeNull();
    });
  });

  describe('getAuditTrail', () => {
    it('should return paginated audit trail with default limit and offset', async () => {
      const fakeRows = [
        { id: 3, action: 'WP_NOTIFICATION_CREATED', new_status: 'Pending', timestamp: '2025-01-15T10:00:00Z', user_name: 'John', user_email: 'john@example.com' },
        { id: 2, action: 'WP_NOTIFICATION_CONFIRM', new_status: 'Confirmed', timestamp: '2025-01-14T10:00:00Z', user_name: 'Jane', user_email: 'jane@example.com' },
      ];

      db.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] }) // count query
        .mockResolvedValueOnce({ rows: fakeRows }); // data query

      const result = await witnessPointService.getAuditTrail({});

      expect(result.rows).toEqual(fakeRows);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      // Verify the base condition filters WP actions only
      expect(db.query.mock.calls[0][0]).toContain("LIKE 'WP_%'");
    });

    it('should filter by instanceId', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, action: 'WP_NOTIFICATION_CREATED' }] });

      await witnessPointService.getAuditTrail({ instanceId: 5 });

      expect(db.query.mock.calls[0][0]).toContain('a.itp_instance_id = $1');
      expect(db.query.mock.calls[0][1]).toEqual([5]);
    });

    it('should filter by pointId', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, action: 'WP_NOTIFICATION_CREATED' }] });

      await witnessPointService.getAuditTrail({ pointId: 42 });

      expect(db.query.mock.calls[0][0]).toContain('a.itp_point_id = $1');
      expect(db.query.mock.calls[0][1]).toEqual([42]);
    });

    it('should filter by status', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, action: 'WP_NOTIFICATION_CONFIRM', new_status: 'Confirmed' }] });

      await witnessPointService.getAuditTrail({ status: 'Confirmed' });

      expect(db.query.mock.calls[0][0]).toContain('a.new_status = $1');
      expect(db.query.mock.calls[0][1]).toEqual(['Confirmed']);
    });

    it('should filter by date range', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '3' }] })
        .mockResolvedValueOnce({ rows: [] });

      await witnessPointService.getAuditTrail({
        dateFrom: '2025-01-01T00:00:00Z',
        dateTo: '2025-01-31T23:59:59Z',
      });

      expect(db.query.mock.calls[0][0]).toContain('a.timestamp >= $1');
      expect(db.query.mock.calls[0][0]).toContain('a.timestamp <= $2');
      expect(db.query.mock.calls[0][1]).toEqual(['2025-01-01T00:00:00Z', '2025-01-31T23:59:59Z']);
    });

    it('should combine multiple filters with correct parameter indices', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await witnessPointService.getAuditTrail({
        instanceId: 5,
        pointId: 42,
        status: 'Pending',
        dateFrom: '2025-01-01T00:00:00Z',
        dateTo: '2025-01-31T23:59:59Z',
      });

      const countQuery = db.query.mock.calls[0][0];
      expect(countQuery).toContain('a.itp_instance_id = $1');
      expect(countQuery).toContain('a.itp_point_id = $2');
      expect(countQuery).toContain('a.new_status = $3');
      expect(countQuery).toContain('a.timestamp >= $4');
      expect(countQuery).toContain('a.timestamp <= $5');
      expect(db.query.mock.calls[0][1]).toEqual([5, 42, 'Pending', '2025-01-01T00:00:00Z', '2025-01-31T23:59:59Z']);
    });

    it('should respect custom limit and offset', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '100' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await witnessPointService.getAuditTrail({ limit: 10, offset: 20 });

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
      // Verify LIMIT and OFFSET are passed as params
      const dataParams = db.query.mock.calls[1][1];
      expect(dataParams[dataParams.length - 2]).toBe(10); // limit
      expect(dataParams[dataParams.length - 1]).toBe(20); // offset
    });

    it('should default to limit 50 and offset 0 for invalid values', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await witnessPointService.getAuditTrail({ limit: -5, offset: -10 });

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should order results by timestamp DESC', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await witnessPointService.getAuditTrail({});

      const dataQuery = db.query.mock.calls[1][0];
      expect(dataQuery).toContain('ORDER BY a.timestamp DESC');
    });

    it('should JOIN users table for user details', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await witnessPointService.getAuditTrail({});

      const dataQuery = db.query.mock.calls[1][0];
      expect(dataQuery).toContain('LEFT JOIN users u ON a.user_id = u.id');
      expect(dataQuery).toContain('u.full_name AS user_name');
      expect(dataQuery).toContain('u.email AS user_email');
    });
  });
});

const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../db');
const witnessPointConfigService = require('./witnessPointConfigService');

const s3 = new S3Client({});
const NOTIFICATION_BUCKET = process.env.NOTIFICATION_BUCKET;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const APP_NAME = 'ITP Management System';
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@emails.ozcc.com.au';

/**
 * Creates a witness point inspection notification.
 *
 * Validates preconditions, inserts notification and recipient records,
 * generates response tokens, queues notification emails via S3, and
 * creates an audit log entry — all within a single database transaction.
 *
 * @param {number} pointId - The ITP point ID (must be type 'WP')
 * @param {number} creatorId - The user ID of the notification creator
 * @param {object} options - Notification options
 * @param {string} options.plannedInspectionTime - ISO 8601 timestamp of planned inspection
 * @param {string} [options.location] - Location description
 * @param {string} [options.scope] - Scope of work description
 * @param {number[]} [options.recipientIds] - Internal user IDs to add as recipients
 * @param {Array<{email: string, name: string}>} [options.externalRecipients] - External recipients
 * @returns {Promise<object>} The created notification record
 */
exports.createNotification = async (pointId, creatorId, { plannedInspectionTime, location, scope, recipientIds, externalRecipients }) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Validate ITP point exists and is type 'WP'
    const pointRes = await client.query(
      `SELECT p.id, p.instance_id, p.type, i.status AS instance_status, i.project_id,
              i.name AS itp_name, p.description AS point_description, proj.name AS project_name
       FROM itp_points p
       JOIN itp_instances i ON p.instance_id = i.id
       JOIN projects proj ON i.project_id = proj.id
       WHERE p.id = $1`,
      [pointId]
    );

    if (pointRes.rows.length === 0) {
      throw new Error('ITP point not found');
    }

    const point = pointRes.rows[0];

    if (point.type !== 'WP') {
      throw new Error('Notifications can only be raised for Witness Points (WP)');
    }

    // 2. Validate ITP instance status is 'Open'
    if (point.instance_status !== 'Open') {
      throw new Error('ITP must be in Open status to raise notifications');
    }

    // 3. Validate planned inspection time against notice period
    const projectConfig = await witnessPointConfigService.getProjectConfig(point.project_id);
    const noticePeriodHours = projectConfig.notice_period_hours;

    const plannedTime = new Date(plannedInspectionTime);
    const now = new Date();
    const minimumTime = new Date(now.getTime() + noticePeriodHours * 60 * 60 * 1000);

    if (plannedTime < minimumTime) {
      throw new Error(`Planned inspection time must be at least ${noticePeriodHours} hours in the future`);
    }

    // 4. Validate no existing 'Pending' notification for this point
    const existingRes = await client.query(
      `SELECT id FROM wp_notifications WHERE itp_point_id = $1 AND status = 'Pending'`,
      [pointId]
    );

    if (existingRes.rows.length > 0) {
      throw new Error('A pending notification already exists for this witness point');
    }

    // 5. Calculate expiry_time = planned_inspection_time - notice_period_hours
    const expiryTime = new Date(plannedTime.getTime() - noticePeriodHours * 60 * 60 * 1000);

    // 6. Insert notification record
    const notificationRes = await client.query(
      `INSERT INTO wp_notifications (
        itp_point_id, itp_instance_id, created_by, status,
        planned_inspection_time, notice_period_hours, expiry_time,
        location_description, scope_of_work
      ) VALUES ($1, $2, $3, 'Pending', $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        pointId,
        point.instance_id,
        creatorId,
        plannedTime.toISOString(),
        noticePeriodHours,
        expiryTime.toISOString(),
        location || null,
        scope || null
      ]
    );

    const notification = notificationRes.rows[0];

    // 7. Build recipient list: merge project defaults with provided overrides
    const defaultRecipients = await witnessPointConfigService.getDefaultRecipients(point.project_id);
    const recipients = [];

    // Add default recipients
    for (const dr of defaultRecipients) {
      recipients.push({
        userId: dr.user_id,
        email: dr.email,
        recipientName: dr.recipient_name,
        isExternal: dr.is_external
      });
    }

    // Add internal recipients by user ID (fetch their details)
    if (recipientIds && recipientIds.length > 0) {
      const usersRes = await client.query(
        `SELECT id, email, full_name FROM users WHERE id = ANY($1)`,
        [recipientIds]
      );
      for (const user of usersRes.rows) {
        // Avoid duplicates (check by email)
        if (!recipients.some(r => r.email === user.email)) {
          recipients.push({
            userId: user.id,
            email: user.email,
            recipientName: user.full_name,
            isExternal: false
          });
        }
      }
    }

    // Add external recipients
    if (externalRecipients && externalRecipients.length > 0) {
      for (const ext of externalRecipients) {
        if (!recipients.some(r => r.email === ext.email)) {
          recipients.push({
            userId: null,
            email: ext.email,
            recipientName: ext.name || null,
            isExternal: true
          });
        }
      }
    }

    // 8. Insert recipients and generate response tokens
    const insertedRecipients = [];
    for (const recipient of recipients) {
      const recipientRes = await client.query(
        `INSERT INTO wp_notification_recipients (notification_id, user_id, email, recipient_name, is_external, notified_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
        [notification.id, recipient.userId, recipient.email, recipient.recipientName, recipient.isExternal]
      );
      const insertedRecipient = recipientRes.rows[0];
      insertedRecipients.push(insertedRecipient);

      // Generate crypto-random response token for each recipient
      const token = crypto.randomBytes(32).toString('hex');
      const tokenExpiresAt = plannedTime; // Token expires at planned inspection time

      await client.query(
        `INSERT INTO wp_response_tokens (notification_id, recipient_id, token, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [notification.id, insertedRecipient.id, token, tokenExpiresAt.toISOString()]
      );

      // 9. Queue notification email via S3
      await queueNotificationEmail(recipient, token, {
        projectName: point.project_name,
        itpName: point.itp_name,
        pointDescription: point.point_description,
        plannedInspectionTime: plannedTime.toISOString(),
        location: location || 'Not specified',
        scope: scope || 'Not specified',
        noticePeriodHours
      });
    }

    // 10. Create audit log entry
    await client.query(
      `INSERT INTO audit_logs (itp_instance_id, itp_point_id, user_id, action, new_status, metadata)
       VALUES ($1, $2, $3, 'WP_NOTIFICATION_CREATED', 'Pending', $4)`,
      [
        point.instance_id,
        pointId,
        creatorId,
        JSON.stringify({
          notification_id: notification.id,
          planned_inspection_time: plannedTime.toISOString(),
          notice_period_hours: noticePeriodHours,
          expiry_time: expiryTime.toISOString(),
          recipient_count: insertedRecipients.length,
          location: location || null,
          scope: scope || null
        })
      ]
    );

    await client.query('COMMIT');

    return {
      ...notification,
      recipients: insertedRecipients
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Queues a witness point notification email to S3 for the notifier Lambda.
 * Follows the existing emailService pattern (S3 → Lambda → SES).
 *
 * @param {object} recipient - Recipient details
 * @param {string} token - Response token for this recipient
 * @param {object} context - Email context (project, ITP, point details)
 */
async function queueNotificationEmail(recipient, token, context) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[WitnessPointService] NOTIFICATION_BUCKET not set — skipping notification email');
    return;
  }

  const responseLink = `${APP_URL}/wp-response/${token}`;
  const recipientDisplay = recipient.recipientName || recipient.email;

  const key = `wp-notification/notify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const payload = {
    type: 'wp_notification',
    to: recipient.email,
    subject: `${APP_NAME} - Witness Point Inspection Notification: ${context.projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">${APP_NAME}</h2>
        <p>Hello ${recipientDisplay},</p>
        <p>A witness point inspection notification has been raised for your attention:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Project: <strong>${context.projectName}</strong></p>
          <p style="margin: 5px 0 0 0;">ITP: <strong>${context.itpName}</strong></p>
          <p style="margin: 5px 0 0 0;">Point: <strong>${context.pointDescription}</strong></p>
          <p style="margin: 10px 0 0 0;">Planned Inspection Time: <strong>${new Date(context.plannedInspectionTime).toLocaleString()}</strong></p>
          <p style="margin: 5px 0 0 0;">Location: ${context.location}</p>
          <p style="margin: 5px 0 0 0;">Scope: ${context.scope}</p>
        </div>
        <p>Please respond to indicate your attendance intention. You have <strong>${context.noticePeriodHours} hours</strong> to respond before your attendance right is automatically waived.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${responseLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Respond to Notification</a>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">If the button doesn't work, copy and paste this URL into your browser:<br/>${responseLink}</p>
      </div>
    `,
    text: `${APP_NAME}\n\nHello ${recipientDisplay},\n\nA witness point inspection notification has been raised:\n\nProject: ${context.projectName}\nITP: ${context.itpName}\nPoint: ${context.pointDescription}\nPlanned Inspection Time: ${new Date(context.plannedInspectionTime).toLocaleString()}\nLocation: ${context.location}\nScope: ${context.scope}\n\nPlease respond within ${context.noticePeriodHours} hours: ${responseLink}\n\nIf you do not respond, your attendance right will be automatically waived.`
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[WitnessPointService] Queued notification email to ${recipient.email}: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    // Log but don't block notification creation (per design: email dispatch failure doesn't block)
    console.error(`[WitnessPointService] Failed to queue notification email to ${recipient.email}:`, error.message);
  }
}

/**
 * Retrieves the most recent notification for a given ITP point.
 * Prefers the active/pending notification if one exists, otherwise returns the most recent one.
 * Includes full recipient details and response token status.
 *
 * @param {number} pointId - The ITP point ID
 * @returns {Promise<object|null>} The notification with recipients, or null if none exists
 */
exports.getNotificationByPoint = async (pointId) => {
  // First try to find a Pending notification (the active one)
  // If none, return the most recently created notification for this point
  const notificationRes = await db.query(
    `SELECT n.*,
            u.full_name AS creator_name,
            u.email AS creator_email
     FROM wp_notifications n
     JOIN users u ON n.created_by = u.id
     WHERE n.itp_point_id = $1
     ORDER BY
       CASE WHEN n.status = 'Pending' THEN 0 ELSE 1 END,
       n.created_at DESC
     LIMIT 1`,
    [pointId]
  );

  if (notificationRes.rows.length === 0) {
    return null;
  }

  const notification = notificationRes.rows[0];

  // Fetch recipients with their token status
  const recipientsRes = await db.query(
    `SELECT r.*,
            t.token,
            t.expires_at AS token_expires_at,
            t.used_at AS token_used_at
     FROM wp_notification_recipients r
     LEFT JOIN wp_response_tokens t ON t.recipient_id = r.id AND t.notification_id = r.notification_id
     WHERE r.notification_id = $1
     ORDER BY r.created_at ASC`,
    [notification.id]
  );

  return {
    ...notification,
    recipients: recipientsRes.rows
  };
};

/**
 * Retrieves a notification by its ID with full recipient details and token status.
 *
 * @param {number} notificationId - The notification ID
 * @returns {Promise<object|null>} The notification with recipients, or null if not found
 */
exports.getNotificationById = async (notificationId) => {
  const notificationRes = await db.query(
    `SELECT n.*,
            u.full_name AS creator_name,
            u.email AS creator_email
     FROM wp_notifications n
     JOIN users u ON n.created_by = u.id
     WHERE n.id = $1`,
    [notificationId]
  );

  if (notificationRes.rows.length === 0) {
    return null;
  }

  const notification = notificationRes.rows[0];

  // Fetch recipients with their token status
  const recipientsRes = await db.query(
    `SELECT r.*,
            t.token,
            t.expires_at AS token_expires_at,
            t.used_at AS token_used_at
     FROM wp_notification_recipients r
     LEFT JOIN wp_response_tokens t ON t.recipient_id = r.id AND t.notification_id = r.notification_id
     WHERE r.notification_id = $1
     ORDER BY r.created_at ASC`,
    [notificationId]
  );

  return {
    ...notification,
    recipients: recipientsRes.rows
  };
};

/**
 * Responds to a witness point notification via a response token (for external recipients).
 * Validates that the token is not expired, not already used, and the notification is still pending.
 *
 * @param {string} token - The response token from the notification email
 * @param {object} options - Response options
 * @param {string} options.responseType - One of 'confirm', 'decline', 'reschedule'
 * @param {string} [options.reason] - Reason for declining (required for 'decline')
 * @param {string} [options.requestedTime] - Requested new time (required for 'reschedule')
 * @returns {Promise<object>} The updated notification record
 */
exports.respondViaToken = async (token, { responseType, reason, requestedTime }) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Look up the token and validate it
    const tokenRes = await client.query(
      `SELECT t.*, r.email AS recipient_email, r.recipient_name, r.user_id AS recipient_user_id
       FROM wp_response_tokens t
       JOIN wp_notification_recipients r ON t.recipient_id = r.id
       WHERE t.token = $1`,
      [token]
    );

    if (tokenRes.rows.length === 0) {
      throw new Error('Invalid or expired response link');
    }

    const tokenRecord = tokenRes.rows[0];

    // 2. Check if token has already been used
    if (tokenRecord.used_at) {
      throw new Error('This response link has already been used');
    }

    // 3. Check if token has expired (expires at planned inspection time)
    const now = new Date();
    if (now > new Date(tokenRecord.expires_at)) {
      throw new Error('This notification has expired. Response is no longer accepted');
    }

    // 4. Get the notification and verify it's still pending
    const notificationRes = await client.query(
      `SELECT n.*, u.full_name AS creator_name, u.email AS creator_email
       FROM wp_notifications n
       JOIN users u ON n.created_by = u.id
       WHERE n.id = $1`,
      [tokenRecord.notification_id]
    );

    if (notificationRes.rows.length === 0) {
      throw new Error('Notification not found');
    }

    const notification = notificationRes.rows[0];

    if (notification.status !== 'Pending') {
      throw new Error('This notification has already been responded to or is no longer pending');
    }

    // 5. Mark token as used
    await client.query(
      `UPDATE wp_response_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [tokenRecord.id]
    );

    // 6. Determine respondent identity (use recipient user_id if internal, otherwise use email)
    const respondentId = tokenRecord.recipient_user_id || null;
    const respondentIdentifier = tokenRecord.recipient_name || tokenRecord.recipient_email;

    // 7. Process the response based on type
    const updatedNotification = await processResponse(client, notification, {
      responseType,
      respondentId,
      respondentIdentifier,
      reason,
      requestedTime
    });

    await client.query('COMMIT');
    return updatedNotification;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Responds to a witness point notification as an authenticated internal user.
 * Does not require a response token — uses the authenticated user's identity.
 *
 * @param {number} notificationId - The notification ID
 * @param {object} options - Response options
 * @param {string} options.responseType - One of 'confirm', 'decline', 'reschedule'
 * @param {number} options.respondentId - The authenticated user's ID
 * @param {string} [options.reason] - Reason for declining (required for 'decline')
 * @param {string} [options.requestedTime] - Requested new time (required for 'reschedule')
 * @returns {Promise<object>} The updated notification record
 */
exports.respondToNotification = async (notificationId, { responseType, respondentId, reason, requestedTime }) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the notification and verify it exists
    const notificationRes = await client.query(
      `SELECT n.*, u.full_name AS creator_name, u.email AS creator_email
       FROM wp_notifications n
       JOIN users u ON n.created_by = u.id
       WHERE n.id = $1`,
      [notificationId]
    );

    if (notificationRes.rows.length === 0) {
      throw new Error('Notification not found');
    }

    const notification = notificationRes.rows[0];

    // 2. Check if notification is still pending
    if (notification.status !== 'Pending') {
      throw new Error('This notification has already been responded to or is no longer pending');
    }

    // 3. Check if planned inspection time has passed
    const now = new Date();
    if (now > new Date(notification.planned_inspection_time)) {
      throw new Error('This notification has expired. Response is no longer accepted');
    }

    // 4. Get respondent details
    const respondentRes = await client.query(
      `SELECT id, full_name, email FROM users WHERE id = $1`,
      [respondentId]
    );

    if (respondentRes.rows.length === 0) {
      throw new Error('Respondent user not found');
    }

    const respondent = respondentRes.rows[0];
    const respondentIdentifier = respondent.full_name || respondent.email;

    // 5. Mark any token for this respondent as used (if they have one)
    await client.query(
      `UPDATE wp_response_tokens SET used_at = CURRENT_TIMESTAMP
       WHERE notification_id = $1
         AND recipient_id IN (
           SELECT id FROM wp_notification_recipients
           WHERE notification_id = $1 AND user_id = $2
         )
         AND used_at IS NULL`,
      [notificationId, respondentId]
    );

    // 6. Process the response based on type
    const updatedNotification = await processResponse(client, notification, {
      responseType,
      respondentId,
      respondentIdentifier,
      reason,
      requestedTime
    });

    await client.query('COMMIT');
    return updatedNotification;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Internal helper: processes a response (confirm/decline/reschedule) within an existing transaction.
 *
 * @param {object} client - The database client (within a transaction)
 * @param {object} notification - The notification record
 * @param {object} options - Response details
 * @param {string} options.responseType - 'confirm', 'decline', or 'reschedule'
 * @param {number|null} options.respondentId - User ID of the respondent (null for external)
 * @param {string} options.respondentIdentifier - Display name/email of the respondent
 * @param {string} [options.reason] - Decline reason
 * @param {string} [options.requestedTime] - Requested reschedule time
 * @returns {Promise<object>} The updated notification
 */
async function processResponse(client, notification, { responseType, respondentId, respondentIdentifier, reason, requestedTime }) {
  let newStatus;
  let updateFields = {};

  switch (responseType) {
    case 'confirm':
      newStatus = 'Confirmed';
      updateFields = {
        status: 'Confirmed',
        responded_by: respondentId,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      break;

    case 'decline':
      newStatus = 'Declined';
      updateFields = {
        status: 'Declined',
        responded_by: respondentId,
        responded_at: new Date().toISOString(),
        response_reason: reason || null,
        updated_at: new Date().toISOString()
      };
      break;

    case 'reschedule':
      newStatus = 'Pending'; // Status stays Pending for reschedule requests
      updateFields = {
        responded_by: respondentId,
        responded_at: new Date().toISOString(),
        requested_reschedule_time: requestedTime ? new Date(requestedTime).toISOString() : null,
        updated_at: new Date().toISOString()
      };
      break;

    default:
      throw new Error(`Invalid response type: ${responseType}. Must be 'confirm', 'decline', or 'reschedule'`);
  }

  // Update the notification record
  if (responseType === 'reschedule') {
    await client.query(
      `UPDATE wp_notifications
       SET responded_by = $1, responded_at = $2, requested_reschedule_time = $3, updated_at = $4
       WHERE id = $5`,
      [
        updateFields.responded_by,
        updateFields.responded_at,
        updateFields.requested_reschedule_time,
        updateFields.updated_at,
        notification.id
      ]
    );
  } else {
    await client.query(
      `UPDATE wp_notifications
       SET status = $1, responded_by = $2, responded_at = $3, response_reason = $4, updated_at = $5
       WHERE id = $6`,
      [
        updateFields.status,
        updateFields.responded_by,
        updateFields.responded_at,
        updateFields.response_reason || null,
        updateFields.updated_at,
        notification.id
      ]
    );
  }

  // Handle decline: trigger auto-waiver on decline
  if (responseType === 'decline') {
    await triggerAutoWaiverOnDecline(client, notification, respondentIdentifier);
  }

  // Handle reschedule: notify the notification creator
  if (responseType === 'reschedule') {
    await queueRescheduleEmail(notification, respondentIdentifier, requestedTime);
  }

  // Create audit log entry for the response
  const previousStatus = notification.status;
  await client.query(
    `INSERT INTO audit_logs (itp_instance_id, itp_point_id, user_id, action, new_status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      notification.itp_instance_id,
      notification.itp_point_id,
      respondentId,
      `WP_NOTIFICATION_${responseType.toUpperCase()}`,
      newStatus,
      JSON.stringify({
        notification_id: notification.id,
        previous_status: previousStatus,
        new_status: newStatus,
        respondent: respondentIdentifier,
        reason: reason || null,
        requested_reschedule_time: requestedTime || null
      })
    ]
  );

  // Return the updated notification
  const updatedRes = await client.query(
    `SELECT * FROM wp_notifications WHERE id = $1`,
    [notification.id]
  );

  return updatedRes.rows[0];
}

/**
 * Triggers auto-waiver when a recipient declines attendance.
 * Inserts into wp_auto_waivers and updates itp_points.wp_waiver_status.
 *
 * @param {object} client - The database client (within a transaction)
 * @param {object} notification - The notification record
 * @param {string} respondentIdentifier - Display name/email of the respondent who declined
 */
async function triggerAutoWaiverOnDecline(client, notification, respondentIdentifier) {
  // Calculate time elapsed since notification creation
  const createdAt = new Date(notification.created_at);
  const now = new Date();
  const timeElapsedHours = ((now - createdAt) / (1000 * 60 * 60)).toFixed(2);

  // Insert auto-waiver record
  await client.query(
    `INSERT INTO wp_auto_waivers (notification_id, itp_point_id, trigger_reason, time_elapsed_hours, metadata)
     VALUES ($1, $2, 'recipient_declined', $3, $4)`,
    [
      notification.id,
      notification.itp_point_id,
      timeElapsedHours,
      JSON.stringify({
        declined_by: respondentIdentifier,
        declined_at: now.toISOString()
      })
    ]
  );

  // Update itp_points.wp_waiver_status
  await client.query(
    `UPDATE itp_points SET wp_waiver_status = $1 WHERE id = $2`,
    [
      JSON.stringify({
        waived: true,
        reason: 'recipient_declined',
        waived_at: now.toISOString(),
        declined_by: respondentIdentifier
      }),
      notification.itp_point_id
    ]
  );

  // Queue waiver confirmation email to the notification creator
  await queueWaiverConfirmationEmail(notification, 'recipient_declined', respondentIdentifier);
}

/**
 * Queues a reschedule request email to the notification creator via S3.
 *
 * @param {object} notification - The notification record (includes creator_name, creator_email)
 * @param {string} respondentIdentifier - Who requested the reschedule
 * @param {string} requestedTime - The requested new inspection time (ISO string)
 */
async function queueRescheduleEmail(notification, respondentIdentifier, requestedTime) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[WitnessPointService] NOTIFICATION_BUCKET not set — skipping reschedule email');
    return;
  }

  const key = `wp-notification/reschedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const formattedRequestedTime = requestedTime ? new Date(requestedTime).toLocaleString() : 'Not specified';
  const formattedPlannedTime = new Date(notification.planned_inspection_time).toLocaleString();

  const payload = {
    type: 'wp_reschedule_request',
    to: notification.creator_email,
    subject: `${APP_NAME} - Reschedule Requested for Witness Point Inspection`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">${APP_NAME}</h2>
        <p>Hello ${notification.creator_name},</p>
        <p><strong>${respondentIdentifier}</strong> has requested a reschedule for the witness point inspection notification.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Current Planned Time: <strong>${formattedPlannedTime}</strong></p>
          <p style="margin: 10px 0 0 0;">Requested New Time: <strong>${formattedRequestedTime}</strong></p>
        </div>
        <p>Please review the reschedule request and update the notification if appropriate.</p>
        <p style="font-size: 12px; color: #94a3b8;">The notification remains in 'Pending' status until you take action.</p>
      </div>
    `,
    text: `${APP_NAME}\n\nHello ${notification.creator_name},\n\n${respondentIdentifier} has requested a reschedule for the witness point inspection notification.\n\nCurrent Planned Time: ${formattedPlannedTime}\nRequested New Time: ${formattedRequestedTime}\n\nPlease review the reschedule request and update the notification if appropriate.\n\nThe notification remains in 'Pending' status until you take action.`
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[WitnessPointService] Queued reschedule email to ${notification.creator_email}: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    // Log but don't block the response (per design: email dispatch failure doesn't block)
    console.error(`[WitnessPointService] Failed to queue reschedule email:`, error.message);
  }
}

/**
 * Queues a waiver confirmation email to the notification creator via S3.
 *
 * @param {object} notification - The notification record (includes creator_name, creator_email)
 * @param {string} triggerReason - 'timer_expired' or 'recipient_declined'
 * @param {string} [declinedBy] - Who declined (only for 'recipient_declined')
 */
async function queueWaiverConfirmationEmail(notification, triggerReason, declinedBy) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[WitnessPointService] NOTIFICATION_BUCKET not set — skipping waiver confirmation email');
    return;
  }

  const key = `wp-notification/waiver-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const reasonText = triggerReason === 'recipient_declined'
    ? `${declinedBy} has declined attendance`
    : 'The notice period has expired without a response';

  const payload = {
    type: 'wp_waiver_confirmation',
    to: notification.creator_email,
    subject: `${APP_NAME} - Witness Point Attendance Waived`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">${APP_NAME}</h2>
        <p>Hello ${notification.creator_name},</p>
        <p>The superintendent's attendance requirement for the following witness point inspection has been <strong>automatically waived</strong>.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Reason: <strong>${reasonText}</strong></p>
          <p style="margin: 10px 0 0 0;">Planned Inspection Time: <strong>${new Date(notification.planned_inspection_time).toLocaleString()}</strong></p>
        </div>
        <p>You may proceed with the inspection without superintendent attendance.</p>
      </div>
    `,
    text: `${APP_NAME}\n\nHello ${notification.creator_name},\n\nThe superintendent's attendance requirement has been automatically waived.\n\nReason: ${reasonText}\nPlanned Inspection Time: ${new Date(notification.planned_inspection_time).toLocaleString()}\n\nYou may proceed with the inspection without superintendent attendance.`
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[WitnessPointService] Queued waiver confirmation email to ${notification.creator_email}: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    console.error(`[WitnessPointService] Failed to queue waiver confirmation email:`, error.message);
  }
}

/**
 * Cancels a pending witness point notification.
 *
 * Validates the notification exists and is in 'Pending' status, updates it to 'Cancelled',
 * sends cancellation emails to all recipients, cancels the EventBridge timer schedule,
 * and creates an audit log entry.
 *
 * @param {number} notificationId - The notification ID to cancel
 * @param {number} userId - The user ID performing the cancellation
 * @param {string} reason - The reason for cancellation
 * @returns {Promise<object>} The updated notification record
 */
exports.cancelNotification = async (notificationId, userId, reason) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Validate notification exists
    const notificationRes = await client.query(
      `SELECT n.*,
              u.full_name AS creator_name,
              u.email AS creator_email,
              proj.name AS project_name,
              i.name AS itp_name,
              p.description AS point_description
       FROM wp_notifications n
       JOIN users u ON n.created_by = u.id
       JOIN itp_instances i ON n.itp_instance_id = i.id
       JOIN itp_points p ON n.itp_point_id = p.id
       JOIN projects proj ON i.project_id = proj.id
       WHERE n.id = $1`,
      [notificationId]
    );

    if (notificationRes.rows.length === 0) {
      throw new Error('Notification not found');
    }

    const notification = notificationRes.rows[0];

    // 2. Validate status is 'Pending'
    if (notification.status !== 'Pending') {
      throw new Error('Only pending notifications can be cancelled');
    }

    // 3. Update status to 'Cancelled'
    const cancelledAt = new Date().toISOString();
    await client.query(
      `UPDATE wp_notifications
       SET status = 'Cancelled',
           cancelled_by = $1,
           cancelled_at = $2,
           cancellation_reason = $3,
           updated_at = $4
       WHERE id = $5`,
      [userId, cancelledAt, reason || null, cancelledAt, notificationId]
    );

    // 4. Send cancellation email to all recipients
    const recipientsRes = await client.query(
      `SELECT * FROM wp_notification_recipients WHERE notification_id = $1`,
      [notificationId]
    );

    for (const recipient of recipientsRes.rows) {
      await queueCancellationEmail(recipient, {
        projectName: notification.project_name,
        itpName: notification.itp_name,
        pointDescription: notification.point_description,
        plannedInspectionTime: notification.planned_inspection_time,
        cancellationReason: reason || 'No reason provided',
        cancelledBy: notification.creator_name
      });
    }

    // 5. Cancel EventBridge schedule (timer)
    try {
      const witnessPointTimerService = require('./witnessPointTimerService');
      await witnessPointTimerService.cancelTimer(notificationId);
    } catch (timerError) {
      // Log but don't fail — timer service may not be available yet
      console.warn(`[WitnessPointService] Failed to cancel timer for notification ${notificationId}:`, timerError.message);
    }

    // 6. Create audit log entry
    await client.query(
      `INSERT INTO audit_logs (itp_instance_id, itp_point_id, user_id, action, new_status, metadata)
       VALUES ($1, $2, $3, 'WP_NOTIFICATION_CANCELLED', 'Cancelled', $4)`,
      [
        notification.itp_instance_id,
        notification.itp_point_id,
        userId,
        JSON.stringify({
          notification_id: notification.id,
          previous_status: notification.status,
          new_status: 'Cancelled',
          cancellation_reason: reason || null,
          cancelled_at: cancelledAt,
          recipient_count: recipientsRes.rows.length
        })
      ]
    );

    await client.query('COMMIT');

    // Return the updated notification
    const updatedRes = await client.query(
      `SELECT * FROM wp_notifications WHERE id = $1`,
      [notificationId]
    );

    return updatedRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Queues a cancellation email to a recipient via S3 for the notifier Lambda.
 *
 * @param {object} recipient - Recipient record from wp_notification_recipients
 * @param {object} context - Email context (project, ITP, point details, cancellation info)
 */
async function queueCancellationEmail(recipient, context) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[WitnessPointService] NOTIFICATION_BUCKET not set — skipping cancellation email');
    return;
  }

  const recipientDisplay = recipient.recipient_name || recipient.email;
  const key = `wp-notification/cancel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const formattedPlannedTime = new Date(context.plannedInspectionTime).toLocaleString();

  const payload = {
    type: 'wp_cancellation',
    to: recipient.email,
    subject: `${APP_NAME} - Witness Point Inspection Cancelled: ${context.projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">${APP_NAME}</h2>
        <p>Hello ${recipientDisplay},</p>
        <p>A witness point inspection notification has been <strong>cancelled</strong>.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Project: <strong>${context.projectName}</strong></p>
          <p style="margin: 5px 0 0 0;">ITP: <strong>${context.itpName}</strong></p>
          <p style="margin: 5px 0 0 0;">Point: <strong>${context.pointDescription}</strong></p>
          <p style="margin: 10px 0 0 0;">Originally Planned Time: <strong>${formattedPlannedTime}</strong></p>
          <p style="margin: 10px 0 0 0;">Cancellation Reason: <strong>${context.cancellationReason}</strong></p>
          <p style="margin: 5px 0 0 0;">Cancelled By: ${context.cancelledBy}</p>
        </div>
        <p>No further action is required from you regarding this inspection.</p>
        <p style="font-size: 12px; color: #94a3b8;">If you believe this cancellation was made in error, please contact the project team.</p>
      </div>
    `,
    text: `${APP_NAME}\n\nHello ${recipientDisplay},\n\nA witness point inspection notification has been cancelled.\n\nProject: ${context.projectName}\nITP: ${context.itpName}\nPoint: ${context.pointDescription}\nOriginally Planned Time: ${formattedPlannedTime}\nCancellation Reason: ${context.cancellationReason}\nCancelled By: ${context.cancelledBy}\n\nNo further action is required from you regarding this inspection.`
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[WitnessPointService] Queued cancellation email to ${recipient.email}: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    // Log but don't block cancellation (per design: email dispatch failure doesn't block)
    console.error(`[WitnessPointService] Failed to queue cancellation email to ${recipient.email}:`, error.message);
  }
}

/**
 * Retrieves the witness point audit trail with filtering and pagination.
 *
 * Queries the audit_logs table for WP-related actions (action LIKE 'WP_%'),
 * supporting filtering by ITP instance, ITP point, notification status, and date range.
 * Results are ordered by timestamp DESC with limit/offset pagination.
 *
 * @param {object} filters - Filter criteria
 * @param {number} [filters.instanceId] - Filter by ITP instance ID
 * @param {number} [filters.pointId] - Filter by ITP point ID
 * @param {string} [filters.status] - Filter by new_status value
 * @param {string} [filters.dateFrom] - Filter entries on or after this ISO date
 * @param {string} [filters.dateTo] - Filter entries on or before this ISO date
 * @param {number} [filters.limit=50] - Maximum number of results to return
 * @param {number} [filters.offset=0] - Number of results to skip
 * @returns {Promise<{rows: Array, total: number, limit: number, offset: number}>} Paginated audit trail results
 */
exports.getAuditTrail = async ({ instanceId, pointId, status, dateFrom, dateTo, limit, offset } = {}) => {
  const parsedLimit = parseInt(limit, 10);
  const parsedOffset = parseInt(offset, 10);
  const paginationLimit = (parsedLimit > 0) ? parsedLimit : 50;
  const paginationOffset = (parsedOffset > 0) ? parsedOffset : 0;

  const conditions = [`a.action LIKE 'WP_%'`];
  const params = [];
  let paramIndex = 1;

  if (instanceId) {
    conditions.push(`a.itp_instance_id = $${paramIndex}`);
    params.push(instanceId);
    paramIndex++;
  }

  if (pointId) {
    conditions.push(`a.itp_point_id = $${paramIndex}`);
    params.push(pointId);
    paramIndex++;
  }

  if (status) {
    conditions.push(`a.new_status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (dateFrom) {
    conditions.push(`a.timestamp >= $${paramIndex}`);
    params.push(dateFrom);
    paramIndex++;
  }

  if (dateTo) {
    conditions.push(`a.timestamp <= $${paramIndex}`);
    params.push(dateTo);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count for pagination metadata
  const countQuery = `SELECT COUNT(*) AS total FROM audit_logs a WHERE ${whereClause}`;
  const countRes = await db.query(countQuery, [...params]);
  const total = parseInt(countRes.rows[0].total, 10);

  // Get paginated results ordered by timestamp DESC
  const dataQuery = `
    SELECT a.*,
           u.full_name AS user_name,
           u.email AS user_email
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE ${whereClause}
    ORDER BY a.timestamp DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  const dataParams = [...params, paginationLimit, paginationOffset];

  const dataRes = await db.query(dataQuery, dataParams);

  return {
    rows: dataRes.rows,
    total,
    limit: paginationLimit,
    offset: paginationOffset
  };
};

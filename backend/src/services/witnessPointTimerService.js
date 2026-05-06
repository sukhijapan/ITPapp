const { SchedulerClient, CreateScheduleCommand, DeleteScheduleCommand } = require('@aws-sdk/client-scheduler');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../db');

const WP_TIMER_LAMBDA_ARN = process.env.WP_TIMER_LAMBDA_ARN;
const WP_TIMER_ROLE_ARN = process.env.WP_TIMER_ROLE_ARN;
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';
const NOTIFICATION_BUCKET = process.env.NOTIFICATION_BUCKET;
const APP_NAME = 'ITP Management System';

const s3 = new S3Client({});

const scheduler = new SchedulerClient({ region: AWS_REGION });

/**
 * Creates a one-shot EventBridge Scheduler schedule that fires at the expiry time
 * to trigger the auto-waiver process for a witness point notification.
 *
 * The schedule targets the wp-timer Lambda with the notification ID in the payload.
 * On success, stores the scheduler ARN on the notification record.
 * On failure, logs the error and sets scheduler_arn to NULL (fallback sweep will handle it).
 *
 * @param {number} notificationId - The notification ID to create a timer for
 * @param {Date|string} expiryTime - The time at which the schedule should fire
 * @returns {Promise<string|null>} The scheduler ARN if created successfully, or null on failure
 */
exports.createTimer = async (notificationId, expiryTime) => {
  const expiry = new Date(expiryTime);

  // Format expiry time for EventBridge Scheduler: at(YYYY-MM-DDTHH:MM:SS)
  const scheduleExpression = `at(${expiry.getUTCFullYear()}-${String(expiry.getUTCMonth() + 1).padStart(2, '0')}-${String(expiry.getUTCDate()).padStart(2, '0')}T${String(expiry.getUTCHours()).padStart(2, '0')}:${String(expiry.getUTCMinutes()).padStart(2, '0')}:${String(expiry.getUTCSeconds()).padStart(2, '0')})`;

  // Generate a unique schedule name
  const scheduleName = `wp-notification-${notificationId}-${Date.now()}`;

  const input = {
    Name: scheduleName,
    ScheduleExpression: scheduleExpression,
    ScheduleExpressionTimezone: 'UTC',
    FlexibleTimeWindow: {
      Mode: 'FLEXIBLE',
      MaximumWindowInMinutes: 5
    },
    Target: {
      Arn: WP_TIMER_LAMBDA_ARN,
      RoleArn: WP_TIMER_ROLE_ARN,
      Input: JSON.stringify({ notificationId })
    },
    ActionAfterCompletion: 'DELETE'
  };

  try {
    const command = new CreateScheduleCommand(input);
    const response = await scheduler.send(command);
    const schedulerArn = response.ScheduleArn;

    // Store the scheduler ARN on the notification record
    await db.query(
      `UPDATE wp_notifications SET scheduler_arn = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [schedulerArn, notificationId]
    );

    console.log(`[WitnessPointTimerService] Created schedule "${scheduleName}" for notification ${notificationId}, ARN: ${schedulerArn}`);
    return schedulerArn;
  } catch (error) {
    // Handle schedule creation failure gracefully: log error, set scheduler_arn to NULL for fallback sweep
    console.error(`[WitnessPointTimerService] Failed to create schedule for notification ${notificationId}:`, error.message);

    await db.query(
      `UPDATE wp_notifications SET scheduler_arn = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [notificationId]
    );

    return null;
  }
};

/**
 * Cancels an EventBridge Scheduler schedule for a notification.
 * Deletes the schedule by its name (extracted from the ARN) and sets scheduler_arn to NULL.
 *
 * @param {number} notificationId - The notification ID whose timer should be cancelled
 * @returns {Promise<boolean>} True if cancelled successfully, false otherwise
 */
exports.cancelTimer = async (notificationId) => {
  // Look up the scheduler ARN from the notification record
  const result = await db.query(
    `SELECT scheduler_arn FROM wp_notifications WHERE id = $1`,
    [notificationId]
  );

  if (result.rows.length === 0) {
    console.warn(`[WitnessPointTimerService] Notification ${notificationId} not found for timer cancellation`);
    return false;
  }

  const schedulerArn = result.rows[0].scheduler_arn;

  if (!schedulerArn) {
    // No schedule to cancel (may have failed to create or already been cleaned up)
    console.log(`[WitnessPointTimerService] No scheduler ARN for notification ${notificationId}, nothing to cancel`);
    return true;
  }

  // Extract the schedule name from the ARN
  // ARN format: arn:aws:scheduler:<region>:<account>:schedule/default/<schedule-name>
  const arnParts = schedulerArn.split('/');
  const scheduleName = arnParts[arnParts.length - 1];

  try {
    const command = new DeleteScheduleCommand({ Name: scheduleName });
    await scheduler.send(command);

    console.log(`[WitnessPointTimerService] Deleted schedule "${scheduleName}" for notification ${notificationId}`);
  } catch (error) {
    // If the schedule doesn't exist (already fired and auto-deleted, or manually removed), that's fine
    if (error.name === 'ResourceNotFoundException') {
      console.log(`[WitnessPointTimerService] Schedule "${scheduleName}" already deleted (ResourceNotFoundException)`);
    } else {
      console.error(`[WitnessPointTimerService] Failed to delete schedule "${scheduleName}" for notification ${notificationId}:`, error.message);
    }
  }

  // Set scheduler_arn to NULL regardless of delete outcome
  await db.query(
    `UPDATE wp_notifications SET scheduler_arn = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [notificationId]
  );

  return true;
};

/**
 * Calculates the remaining time until the planned inspection for a notification.
 * Returns the time decomposed into hours, minutes, and seconds.
 * Returns zero values if the planned inspection time has already passed.
 *
 * @param {number} notificationId - The notification ID
 * @returns {Promise<{hours: number, minutes: number, seconds: number, totalSeconds: number}|null>}
 *   The remaining time, or null if the notification is not found
 */
exports.getRemainingTime = async (notificationId) => {
  const result = await db.query(
    `SELECT planned_inspection_time, status FROM wp_notifications WHERE id = $1`,
    [notificationId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const { planned_inspection_time } = result.rows[0];
  const plannedTime = new Date(planned_inspection_time);
  const now = new Date();

  const diffMs = plannedTime.getTime() - now.getTime();

  // If planned time has passed, return zeros
  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalSeconds };
};

/**
 * Processes the auto-waiver for a notification whose timer has expired.
 *
 * This method is idempotent: if the notification has already been responded to,
 * cancelled, or expired, it is a no-op. Only notifications with status 'Pending'
 * are processed.
 *
 * Steps:
 * 1. Validate notification exists and is still 'Pending'
 * 2. Update notification status to 'Expired'
 * 3. Insert wp_auto_waivers record with trigger_reason 'timer_expired'
 * 4. Update itp_points.wp_waiver_status JSONB
 * 5. Send waiver confirmation email to notification creator
 * 6. Send waiver notification email to original recipients
 * 7. Create audit log entry
 *
 * @param {number} notificationId - The notification ID to process auto-waiver for
 * @returns {Promise<object|null>} The updated notification, or null if no-op (already handled)
 */
exports.processAutoWaiver = async (notificationId) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch notification with creator details and project context
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
      console.warn(`[WitnessPointTimerService] Notification ${notificationId} not found for auto-waiver`);
      await client.query('ROLLBACK');
      return null;
    }

    const notification = notificationRes.rows[0];

    // Idempotent check: only process if still 'Pending'
    if (notification.status !== 'Pending') {
      console.log(`[WitnessPointTimerService] Notification ${notificationId} status is '${notification.status}', skipping auto-waiver (no-op)`);
      await client.query('ROLLBACK');
      return null;
    }

    // 2. Update notification status to 'Expired'
    const now = new Date();
    await client.query(
      `UPDATE wp_notifications
       SET status = 'Expired', updated_at = $1
       WHERE id = $2`,
      [now.toISOString(), notificationId]
    );

    // 3. Calculate time_elapsed_hours and insert wp_auto_waivers record
    const createdAt = new Date(notification.created_at);
    const timeElapsedHours = ((now - createdAt) / (1000 * 60 * 60)).toFixed(2);

    await client.query(
      `INSERT INTO wp_auto_waivers (notification_id, itp_point_id, trigger_reason, time_elapsed_hours, metadata)
       VALUES ($1, $2, 'timer_expired', $3, $4)`,
      [
        notificationId,
        notification.itp_point_id,
        timeElapsedHours,
        JSON.stringify({
          planned_inspection_time: notification.planned_inspection_time,
          expiry_time: notification.expiry_time,
          triggered_at: now.toISOString()
        })
      ]
    );

    // 4. Update itp_points.wp_waiver_status JSONB
    const waiverStatus = {
      waived: true,
      reason: 'timer_expired',
      waived_at: now.toISOString(),
      notification_id: notification.id
    };

    await client.query(
      `UPDATE itp_points SET wp_waiver_status = $1 WHERE id = $2`,
      [JSON.stringify(waiverStatus), notification.itp_point_id]
    );

    // 5. Send waiver confirmation email to notification creator
    await queueWaiverConfirmationEmail(notification, now);

    // 6. Send waiver notification email to original recipients
    const recipientsRes = await client.query(
      `SELECT * FROM wp_notification_recipients WHERE notification_id = $1`,
      [notificationId]
    );

    for (const recipient of recipientsRes.rows) {
      await queueWaiverNoticeEmail(recipient, notification, now);
    }

    // 7. Create audit log entry
    await client.query(
      `INSERT INTO audit_logs (itp_instance_id, itp_point_id, user_id, action, new_status, metadata)
       VALUES ($1, $2, $3, 'WP_NOTIFICATION_EXPIRED', 'Expired', $4)`,
      [
        notification.itp_instance_id,
        notification.itp_point_id,
        null, // System-triggered, no user
        JSON.stringify({
          notification_id: notification.id,
          previous_status: 'Pending',
          new_status: 'Expired',
          trigger_reason: 'timer_expired',
          time_elapsed_hours: parseFloat(timeElapsedHours),
          planned_inspection_time: notification.planned_inspection_time,
          expiry_time: notification.expiry_time
        })
      ]
    );

    await client.query('COMMIT');

    console.log(`[WitnessPointTimerService] Auto-waiver processed for notification ${notificationId} (elapsed: ${timeElapsedHours}h)`);

    // Return the updated notification
    const updatedRes = await db.query(
      `SELECT * FROM wp_notifications WHERE id = $1`,
      [notificationId]
    );

    return updatedRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[WitnessPointTimerService] Error processing auto-waiver for notification ${notificationId}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Queues a waiver confirmation email to the notification creator via S3.
 * Informs the creator that the witness point may proceed without superintendent attendance.
 *
 * @param {object} notification - The notification record with creator details
 * @param {Date} triggeredAt - When the auto-waiver was triggered
 */
async function queueWaiverConfirmationEmail(notification, triggeredAt) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[WitnessPointTimerService] NOTIFICATION_BUCKET not set — skipping waiver confirmation email');
    return;
  }

  const key = `wp-notification/waiver-confirm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const formattedPlannedTime = new Date(notification.planned_inspection_time).toLocaleString();

  const payload = {
    type: 'wp_waiver_confirmation',
    to: notification.creator_email,
    subject: `${APP_NAME} - Witness Point Attendance Waived`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">${APP_NAME}</h2>
        <p>Hello ${notification.creator_name},</p>
        <p>The superintendent's attendance requirement for the following witness point inspection has been <strong>automatically waived</strong> due to non-response within the notice period.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Project: <strong>${notification.project_name}</strong></p>
          <p style="margin: 5px 0 0 0;">ITP: <strong>${notification.itp_name}</strong></p>
          <p style="margin: 5px 0 0 0;">Point: <strong>${notification.point_description}</strong></p>
          <p style="margin: 10px 0 0 0;">Planned Inspection Time: <strong>${formattedPlannedTime}</strong></p>
          <p style="margin: 10px 0 0 0;">Reason: <strong>Notice period expired without response</strong></p>
        </div>
        <p>You may proceed with the inspection without superintendent attendance.</p>
      </div>
    `,
    text: `${APP_NAME}\n\nHello ${notification.creator_name},\n\nThe superintendent's attendance requirement has been automatically waived due to non-response within the notice period.\n\nProject: ${notification.project_name}\nITP: ${notification.itp_name}\nPoint: ${notification.point_description}\nPlanned Inspection Time: ${formattedPlannedTime}\nReason: Notice period expired without response\n\nYou may proceed with the inspection without superintendent attendance.`
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[WitnessPointTimerService] Queued waiver confirmation email to ${notification.creator_email}: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    console.error(`[WitnessPointTimerService] Failed to queue waiver confirmation email:`, error.message);
  }
}

/**
 * Queues a waiver notice email to a notification recipient via S3.
 * Informs the recipient that their attendance right has been waived due to non-response.
 *
 * @param {object} recipient - The recipient record from wp_notification_recipients
 * @param {object} notification - The notification record with project context
 * @param {Date} triggeredAt - When the auto-waiver was triggered
 */
async function queueWaiverNoticeEmail(recipient, notification, triggeredAt) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[WitnessPointTimerService] NOTIFICATION_BUCKET not set — skipping waiver notice email');
    return;
  }

  const recipientDisplay = recipient.recipient_name || recipient.email;
  const key = `wp-notification/waiver-notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const formattedPlannedTime = new Date(notification.planned_inspection_time).toLocaleString();

  const payload = {
    type: 'wp_waiver_notice',
    to: recipient.email,
    subject: `${APP_NAME} - Witness Point Attendance Right Waived`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">${APP_NAME}</h2>
        <p>Hello ${recipientDisplay},</p>
        <p>Your attendance right for the following witness point inspection has been <strong>automatically waived</strong> because no response was received within the notice period.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Project: <strong>${notification.project_name}</strong></p>
          <p style="margin: 5px 0 0 0;">ITP: <strong>${notification.itp_name}</strong></p>
          <p style="margin: 5px 0 0 0;">Point: <strong>${notification.point_description}</strong></p>
          <p style="margin: 10px 0 0 0;">Planned Inspection Time: <strong>${formattedPlannedTime}</strong></p>
        </div>
        <p>The contractor may proceed with the inspection without your attendance. If you wish to attend, please contact the project team directly.</p>
      </div>
    `,
    text: `${APP_NAME}\n\nHello ${recipientDisplay},\n\nYour attendance right for the following witness point inspection has been automatically waived because no response was received within the notice period.\n\nProject: ${notification.project_name}\nITP: ${notification.itp_name}\nPoint: ${notification.point_description}\nPlanned Inspection Time: ${formattedPlannedTime}\n\nThe contractor may proceed with the inspection without your attendance. If you wish to attend, please contact the project team directly.`
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[WitnessPointTimerService] Queued waiver notice email to ${recipient.email}: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    console.error(`[WitnessPointTimerService] Failed to queue waiver notice email to ${recipient.email}:`, error.message);
  }
}

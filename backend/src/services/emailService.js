const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({});
const NOTIFICATION_BUCKET = process.env.NOTIFICATION_BUCKET;
const APP_NAME = 'ITP Management System';
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@emails.ozcc.com.au';

/**
 * Send an invitation email by queuing it to S3 for the notifier Lambda.
 * @param {string} toEmail - Recipient email address
 * @param {string} token - Invitation token
 * @param {string} roleName - Name of the role being assigned
 * @param {string} inviterName - Username of the person sending the invitation
 * @param {string} inviterEmail - Email of the person sending the invitation
 * @returns {Promise<void>}
 */
async function sendInvitationEmail(toEmail, token, roleName, inviterName, inviterEmail) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[EmailService] NOTIFICATION_BUCKET not set — skipping invitation email');
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const registrationLink = `${appUrl}/register/${token}`;
  const inviterDisplay = inviterEmail ? `${inviterName} (${inviterEmail})` : inviterName;

  const key = `email/invitation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const payload = {
    type: 'invitation',
    to: toEmail,
    subject: `${APP_NAME} - ${inviterName} has invited you`,
    html: `
      <h2>${APP_NAME}</h2>
      <p><strong>${inviterDisplay}</strong> has invited you to join the ${APP_NAME} as a <strong>${roleName}</strong>.</p>
      <p>Click the link below to complete your registration:</p>
      <p><a href="${registrationLink}">${registrationLink}</a></p>
      <p>This invitation link will expire in 72 hours.</p>
      <p>If you did not expect this invitation, you can safely ignore this email.</p>
    `,
    text: `${APP_NAME}\n\n${inviterDisplay} has invited you to join the ${APP_NAME} as a ${roleName}.\n\nComplete your registration here: ${registrationLink}\n\nThis invitation link will expire in 72 hours.\n\nIf you did not expect this invitation, you can safely ignore this email.`,
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[EmailService] Queued invitation email: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    console.error(`[EmailService] Failed to queue invitation email to ${toEmail}:`, error.message);
    throw error;
  }
}

/**
 * Send a password reset email by queuing it to S3 for the notifier Lambda.
 * @param {string} toEmail - Recipient email address
 * @param {string} token - Password reset token
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(toEmail, token) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[EmailService] NOTIFICATION_BUCKET not set — skipping password reset email');
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const resetLink = `${appUrl}/reset-password/${token}`;

  const key = `email/reset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const payload = {
    type: 'password_reset',
    to: toEmail,
    subject: `${APP_NAME} - Password Reset Request`,
    html: `
      <h2>${APP_NAME}</h2>
      <p>You have requested a password reset for your ${APP_NAME} account.</p>
      <p>Click the link below to set a new password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    `,
    text: `${APP_NAME}\n\nYou have requested a password reset for your ${APP_NAME} account.\n\nSet a new password here: ${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, you can safely ignore this email.`,
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[EmailService] Queued password reset email: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    console.error(`[EmailService] Failed to queue password reset email to ${toEmail}:`, error.message);
    throw error;
  }
}

/**
 * Send an external sign-off request email.
 */
async function sendExternalSignOffEmail(toEmail, token, context) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[EmailService] NOTIFICATION_BUCKET not set — skipping external sign-off email');
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const signOffLink = `${appUrl}/external-sign-off/${token}`;

  const key = `email/signoff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const payload = {
    type: 'external_sign_off',
    to: toEmail,
    subject: `${APP_NAME} - Action Required: Sign-off for ${context.projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">${APP_NAME}</h2>
        <p>Hello,</p>
        <p><strong>${context.requesterName}</strong> has requested your sign-off as <strong>${context.roleName}</strong> for the following inspection point:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Project: ${context.projectName}</p>
          <p style="margin: 5px 0 0 0; font-weight: bold;">${context.itpName}</p>
          <p style="margin: 10px 0 0 0; font-style: italic;">"${context.pointDescription}"</p>
        </div>
        <p>Please click the button below to review and sign off on this item. No login is required.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${signOffLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review and Sign Off</a>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">This link will expire in 48 hours. If the button doesn't work, copy and paste this URL into your browser: <br/> ${signOffLink}</p>
      </div>
    `,
    text: `${APP_NAME}\n\n${context.requesterName} has requested your sign-off as ${context.roleName} for: ${context.pointDescription}\n\nReview and sign off here: ${signOffLink}\n\nThis link will expire in 48 hours.`,
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[EmailService] Queued external sign-off email to ${toEmail}`);
  } catch (error) {
    console.error(`[EmailService] Failed to queue external sign-off email to ${toEmail}:`, error.message);
    throw error;
  }
}

/**
 * Send a witness point notification email to a recipient.
 * Includes a response link with the recipient's unique token.
 * @param {string} toEmail - Recipient email address
 * @param {string} token - Response token for this recipient
 * @param {object} context - Notification context
 * @param {string} context.projectName - Project name
 * @param {string} context.itpName - ITP name
 * @param {string} context.pointDescription - Description of the witness point
 * @param {string} context.plannedInspectionTime - Planned inspection time (ISO string)
 * @param {string} context.location - Location description
 * @param {string} context.scope - Scope of work
 * @param {number} context.noticePeriodHours - Configured notice period in hours
 * @param {string} context.respondentName - Name of the recipient
 * @returns {Promise<void>}
 */
async function sendWitnessPointNotificationEmail(toEmail, token, context) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[EmailService] NOTIFICATION_BUCKET not set — skipping witness point notification email');
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const responseLink = `${appUrl}/wp-response/${token}`;

  const key = `wp-notification/notify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const payload = {
    type: 'wp_notification',
    to: toEmail,
    subject: `${APP_NAME} - Witness Point Inspection Notification: ${context.projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">${APP_NAME}</h2>
        <p>Hello${context.respondentName ? ` ${context.respondentName}` : ''},</p>
        <p>A witness point inspection notification has been raised for your attention:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Project: ${context.projectName}</p>
          <p style="margin: 5px 0 0 0; font-weight: bold;">${context.itpName}</p>
          <p style="margin: 10px 0 0 0; font-style: italic;">"${context.pointDescription}"</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">Planned Inspection: ${context.plannedInspectionTime}</p>
          ${context.location ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Location: ${context.location}</p>` : ''}
          ${context.scope ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Scope: ${context.scope}</p>` : ''}
        </div>
        <p>Please respond to this notification by confirming your attendance, declining, or requesting a reschedule.</p>
        <p>The notice period is <strong>${context.noticePeriodHours} hours</strong>. If no response is received before the notice period expires, your attendance right will be automatically waived.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${responseLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Respond to Notification</a>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">If the button doesn't work, copy and paste this URL into your browser: <br/> ${responseLink}</p>
      </div>
    `,
    text: `${APP_NAME}\n\nA witness point inspection notification has been raised for your attention.\n\nProject: ${context.projectName}\nITP: ${context.itpName}\nPoint: ${context.pointDescription}\nPlanned Inspection: ${context.plannedInspectionTime}\n${context.location ? `Location: ${context.location}\n` : ''}${context.scope ? `Scope: ${context.scope}\n` : ''}\nNotice Period: ${context.noticePeriodHours} hours\n\nPlease respond here: ${responseLink}\n\nIf no response is received before the notice period expires, your attendance right will be automatically waived.`,
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[EmailService] Queued witness point notification email: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    console.error(`[EmailService] Failed to queue witness point notification email to ${toEmail}:`, error.message);
    throw error;
  }
}

/**
 * Send a waiver confirmation email to the notification creator.
 * Sent when auto-waiver is triggered (timer expired or recipient declined).
 * @param {string} toEmail - Creator's email address
 * @param {object} context - Waiver context
 * @param {string} context.projectName - Project name
 * @param {string} context.itpName - ITP name
 * @param {string} context.pointDescription - Description of the witness point
 * @param {string} context.plannedInspectionTime - Planned inspection time (ISO string)
 * @param {string} context.location - Location description
 * @param {string} context.scope - Scope of work
 * @param {string} context.waiverReason - Reason for waiver ('timer_expired' or 'recipient_declined')
 * @returns {Promise<void>}
 */
async function sendWitnessPointWaiverEmail(toEmail, context) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[EmailService] NOTIFICATION_BUCKET not set — skipping witness point waiver email');
    return;
  }

  const reasonText = context.waiverReason === 'timer_expired'
    ? 'The notice period expired without a response from the recipient.'
    : 'The recipient explicitly declined attendance.';

  const key = `wp-notification/waiver-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const payload = {
    type: 'wp_waiver',
    to: toEmail,
    subject: `${APP_NAME} - Witness Point Waiver Confirmed: ${context.projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">${APP_NAME}</h2>
        <p>Hello,</p>
        <p>The superintendent's attendance right has been <strong>automatically waived</strong> for the following witness point inspection:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Project: ${context.projectName}</p>
          <p style="margin: 5px 0 0 0; font-weight: bold;">${context.itpName}</p>
          <p style="margin: 10px 0 0 0; font-style: italic;">"${context.pointDescription}"</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">Planned Inspection: ${context.plannedInspectionTime}</p>
          ${context.location ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Location: ${context.location}</p>` : ''}
        </div>
        <p><strong>Reason:</strong> ${reasonText}</p>
        <p>You may proceed with the inspection without superintendent attendance. The waiver has been recorded in the audit trail.</p>
      </div>
    `,
    text: `${APP_NAME}\n\nThe superintendent's attendance right has been automatically waived for the following witness point inspection.\n\nProject: ${context.projectName}\nITP: ${context.itpName}\nPoint: ${context.pointDescription}\nPlanned Inspection: ${context.plannedInspectionTime}\n${context.location ? `Location: ${context.location}\n` : ''}\nReason: ${reasonText}\n\nYou may proceed with the inspection without superintendent attendance. The waiver has been recorded in the audit trail.`,
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[EmailService] Queued witness point waiver email: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    console.error(`[EmailService] Failed to queue witness point waiver email to ${toEmail}:`, error.message);
    throw error;
  }
}

/**
 * Send a waiver notice email to the original notification recipient.
 * Informs them that their attendance right has been waived due to non-response.
 * @param {string} toEmail - Recipient's email address
 * @param {object} context - Waiver notice context
 * @param {string} context.projectName - Project name
 * @param {string} context.itpName - ITP name
 * @param {string} context.pointDescription - Description of the witness point
 * @param {string} context.plannedInspectionTime - Planned inspection time (ISO string)
 * @param {string} context.location - Location description
 * @param {string} context.scope - Scope of work
 * @param {string} context.waiverReason - Reason for waiver ('timer_expired' or 'recipient_declined')
 * @param {string} context.respondentName - Name of the recipient
 * @returns {Promise<void>}
 */
async function sendWitnessPointWaiverNoticeEmail(toEmail, context) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[EmailService] NOTIFICATION_BUCKET not set — skipping witness point waiver notice email');
    return;
  }

  const reasonText = context.waiverReason === 'timer_expired'
    ? 'The notice period expired without a response.'
    : 'You explicitly declined attendance.';

  const key = `wp-notification/waiver-notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const payload = {
    type: 'wp_waiver_notice',
    to: toEmail,
    subject: `${APP_NAME} - Attendance Right Waived: ${context.projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">${APP_NAME}</h2>
        <p>Hello${context.respondentName ? ` ${context.respondentName}` : ''},</p>
        <p>Your attendance right has been <strong>waived</strong> for the following witness point inspection:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Project: ${context.projectName}</p>
          <p style="margin: 5px 0 0 0; font-weight: bold;">${context.itpName}</p>
          <p style="margin: 10px 0 0 0; font-style: italic;">"${context.pointDescription}"</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">Planned Inspection: ${context.plannedInspectionTime}</p>
          ${context.location ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Location: ${context.location}</p>` : ''}
        </div>
        <p><strong>Reason:</strong> ${reasonText}</p>
        <p>The contractor may proceed with the inspection without your attendance. This has been recorded in the project audit trail.</p>
      </div>
    `,
    text: `${APP_NAME}\n\nYour attendance right has been waived for the following witness point inspection.\n\nProject: ${context.projectName}\nITP: ${context.itpName}\nPoint: ${context.pointDescription}\nPlanned Inspection: ${context.plannedInspectionTime}\n${context.location ? `Location: ${context.location}\n` : ''}\nReason: ${reasonText}\n\nThe contractor may proceed with the inspection without your attendance. This has been recorded in the project audit trail.`,
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[EmailService] Queued witness point waiver notice email: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    console.error(`[EmailService] Failed to queue witness point waiver notice email to ${toEmail}:`, error.message);
    throw error;
  }
}

/**
 * Send a cancellation email to notification recipients.
 * Sent when the notification creator cancels a pending notification.
 * @param {string} toEmail - Recipient's email address
 * @param {object} context - Cancellation context
 * @param {string} context.projectName - Project name
 * @param {string} context.itpName - ITP name
 * @param {string} context.pointDescription - Description of the witness point
 * @param {string} context.plannedInspectionTime - Planned inspection time (ISO string)
 * @param {string} context.location - Location description
 * @param {string} context.cancellationReason - Reason for cancellation
 * @param {string} context.cancelledBy - Name of the user who cancelled
 * @param {string} context.respondentName - Name of the recipient
 * @returns {Promise<void>}
 */
async function sendWitnessPointCancellationEmail(toEmail, context) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[EmailService] NOTIFICATION_BUCKET not set — skipping witness point cancellation email');
    return;
  }

  const key = `wp-notification/cancel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const payload = {
    type: 'wp_cancellation',
    to: toEmail,
    subject: `${APP_NAME} - Inspection Notification Cancelled: ${context.projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">${APP_NAME}</h2>
        <p>Hello${context.respondentName ? ` ${context.respondentName}` : ''},</p>
        <p>A witness point inspection notification has been <strong>cancelled</strong>:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Project: ${context.projectName}</p>
          <p style="margin: 5px 0 0 0; font-weight: bold;">${context.itpName}</p>
          <p style="margin: 10px 0 0 0; font-style: italic;">"${context.pointDescription}"</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">Planned Inspection: ${context.plannedInspectionTime}</p>
          ${context.location ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Location: ${context.location}</p>` : ''}
        </div>
        <p><strong>Cancelled by:</strong> ${context.cancelledBy}</p>
        ${context.cancellationReason ? `<p><strong>Reason:</strong> ${context.cancellationReason}</p>` : ''}
        <p>No further action is required. The planned inspection will not proceed as originally scheduled.</p>
      </div>
    `,
    text: `${APP_NAME}\n\nA witness point inspection notification has been cancelled.\n\nProject: ${context.projectName}\nITP: ${context.itpName}\nPoint: ${context.pointDescription}\nPlanned Inspection: ${context.plannedInspectionTime}\n${context.location ? `Location: ${context.location}\n` : ''}\nCancelled by: ${context.cancelledBy}\n${context.cancellationReason ? `Reason: ${context.cancellationReason}\n` : ''}\nNo further action is required. The planned inspection will not proceed as originally scheduled.`,
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[EmailService] Queued witness point cancellation email: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    console.error(`[EmailService] Failed to queue witness point cancellation email to ${toEmail}:`, error.message);
    throw error;
  }
}

/**
 * Send a reschedule request email to the notification creator.
 * Sent when a recipient requests a reschedule via their response.
 * @param {string} toEmail - Creator's email address
 * @param {object} context - Reschedule context
 * @param {string} context.projectName - Project name
 * @param {string} context.itpName - ITP name
 * @param {string} context.pointDescription - Description of the witness point
 * @param {string} context.plannedInspectionTime - Original planned inspection time (ISO string)
 * @param {string} context.location - Location description
 * @param {string} context.respondentName - Name of the recipient requesting reschedule
 * @param {string} context.requestedTime - Requested new inspection time (ISO string)
 * @returns {Promise<void>}
 */
async function sendWitnessPointRescheduleRequestEmail(toEmail, context) {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[EmailService] NOTIFICATION_BUCKET not set — skipping witness point reschedule request email');
    return;
  }

  const key = `wp-notification/reschedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const payload = {
    type: 'wp_reschedule_request',
    to: toEmail,
    subject: `${APP_NAME} - Reschedule Requested: ${context.projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #2563eb;">${APP_NAME}</h2>
        <p>Hello,</p>
        <p><strong>${context.respondentName}</strong> has requested a reschedule for the following witness point inspection:</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Project: ${context.projectName}</p>
          <p style="margin: 5px 0 0 0; font-weight: bold;">${context.itpName}</p>
          <p style="margin: 10px 0 0 0; font-style: italic;">"${context.pointDescription}"</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">Original Planned Inspection: ${context.plannedInspectionTime}</p>
          ${context.location ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Location: ${context.location}</p>` : ''}
        </div>
        <p><strong>Requested New Time:</strong> ${context.requestedTime}</p>
        <p>Please review this request and cancel the current notification if you wish to reschedule, then raise a new notification with the updated time.</p>
      </div>
    `,
    text: `${APP_NAME}\n\n${context.respondentName} has requested a reschedule for the following witness point inspection.\n\nProject: ${context.projectName}\nITP: ${context.itpName}\nPoint: ${context.pointDescription}\nOriginal Planned Inspection: ${context.plannedInspectionTime}\n${context.location ? `Location: ${context.location}\n` : ''}\nRequested New Time: ${context.requestedTime}\n\nPlease review this request and cancel the current notification if you wish to reschedule, then raise a new notification with the updated time.`,
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[EmailService] Queued witness point reschedule request email: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (error) {
    console.error(`[EmailService] Failed to queue witness point reschedule request email to ${toEmail}:`, error.message);
    throw error;
  }
}

module.exports = {
  sendInvitationEmail,
  sendPasswordResetEmail,
  sendExternalSignOffEmail,
  sendWitnessPointNotificationEmail,
  sendWitnessPointWaiverEmail,
  sendWitnessPointWaiverNoticeEmail,
  sendWitnessPointCancellationEmail,
  sendWitnessPointRescheduleRequestEmail,
};

const witnessPointService = require('../services/witnessPointService');
const witnessPointTimerService = require('../services/witnessPointTimerService');
const witnessPointConfigService = require('../services/witnessPointConfigService');

/**
 * Maps service error messages to appropriate HTTP status codes.
 */
function getErrorStatusCode(message) {
  const msg = (message || '').toLowerCase();

  // 404 — Not Found
  if (msg.includes('not found')) return 404;

  // 403 — Forbidden
  if (msg.includes('only subcontractors')) return 403;
  if (msg.includes('only the notification creator')) return 403;
  if (msg.includes('only head contractors')) return 403;

  // 400 — Bad Request
  if (msg.includes('already exists')) return 400;
  if (msg.includes('only pending')) return 400;
  if (msg.includes('already been used')) return 400;
  if (msg.includes('expired')) return 400;

  // 500 — Internal Server Error (default)
  return 500;
}

/**
 * POST /api/wp-notifications
 * Create a witness point notification.
 * Authenticated, role check: Subcontractor (1) or Head Contractor (2) only.
 */
exports.createNotification = async (req, res) => {
  const { pointId, plannedInspectionTime, location, scope, recipientIds, externalRecipients } = req.body;
  const userId = req.user.userId;
  const roleId = req.user.roleId;

  // Role check: Only Subcontractors (1) and Head Contractors (2) can raise notifications
  if (![1, 2].includes(roleId)) {
    return res.status(403).json({ error: 'Only Subcontractors and Head Contractors can raise notifications' });
  }

  if (!pointId || !plannedInspectionTime) {
    return res.status(400).json({ error: 'pointId and plannedInspectionTime are required' });
  }

  try {
    const notification = await witnessPointService.createNotification(pointId, userId, {
      plannedInspectionTime,
      location,
      scope,
      recipientIds,
      externalRecipients
    });

    // Create EventBridge timer for auto-waiver at expiry time
    try {
      await witnessPointTimerService.createTimer(notification.id, notification.expiry_time);
    } catch (timerErr) {
      console.error('[WitnessPointController] Failed to create timer:', timerErr.message);
      // Timer failure is non-blocking (fallback sweep will handle it)
    }

    res.status(201).json({ message: 'Notification created', data: notification });
  } catch (err) {
    console.error('[WitnessPointController] createNotification error:', err);
    const statusCode = getErrorStatusCode(err.message);
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * GET /api/wp-notifications/point/:pointId
 * Get the current notification for a specific ITP point.
 * Authenticated.
 */
exports.getNotificationByPoint = async (req, res) => {
  const { pointId } = req.params;

  if (!pointId) {
    return res.status(400).json({ error: 'pointId is required' });
  }

  try {
    const notification = await witnessPointService.getNotificationByPoint(parseInt(pointId, 10));

    if (!notification) {
      return res.json({ data: null });
    }

    res.json({ data: notification });
  } catch (err) {
    console.error('[WitnessPointController] getNotificationByPoint error:', err);
    const statusCode = getErrorStatusCode(err.message);
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * GET /api/wp-notifications/:id
 * Get a notification by its ID.
 * Authenticated.
 */
exports.getNotificationById = async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await witnessPointService.getNotificationById(parseInt(id, 10));

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ data: notification });
  } catch (err) {
    console.error('[WitnessPointController] getNotificationById error:', err);
    const statusCode = getErrorStatusCode(err.message);
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * POST /api/wp-notifications/:id/cancel
 * Cancel a pending notification.
 * Authenticated, creator-only check.
 */
exports.cancelNotification = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.userId;

  try {
    // Verify the user is the notification creator
    const notification = await witnessPointService.getNotificationById(parseInt(id, 10));

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.created_by !== userId) {
      return res.status(403).json({ error: 'Only the notification creator can cancel a notification' });
    }

    const result = await witnessPointService.cancelNotification(parseInt(id, 10), userId, reason);
    res.json({ message: 'Notification cancelled', data: result });
  } catch (err) {
    console.error('[WitnessPointController] cancelNotification error:', err);
    const statusCode = getErrorStatusCode(err.message);
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * POST /api/wp-notifications/:id/respond
 * Respond to a notification as an authenticated internal user.
 * Authenticated.
 */
exports.respondAuthenticated = async (req, res) => {
  const { id } = req.params;
  const { responseType, reason, requestedTime } = req.body;
  const userId = req.user.userId;

  if (!responseType) {
    return res.status(400).json({ error: 'responseType is required' });
  }

  if (!['confirm', 'decline', 'reschedule'].includes(responseType)) {
    return res.status(400).json({ error: "responseType must be 'confirm', 'decline', or 'reschedule'" });
  }

  if (responseType === 'decline' && !reason) {
    return res.status(400).json({ error: 'reason is required when declining' });
  }

  if (responseType === 'reschedule' && !requestedTime) {
    return res.status(400).json({ error: 'requestedTime is required when requesting a reschedule' });
  }

  try {
    const result = await witnessPointService.respondToNotification(parseInt(id, 10), {
      responseType,
      respondentId: userId,
      reason,
      requestedTime
    });
    res.json({ message: `Notification ${responseType}ed`, data: result });
  } catch (err) {
    console.error('[WitnessPointController] respondAuthenticated error:', err);
    const statusCode = getErrorStatusCode(err.message);
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * GET /api/wp-notifications/:id/remaining-time
 * Get the remaining time until planned inspection.
 * Authenticated.
 */
exports.getRemainingTime = async (req, res) => {
  const { id } = req.params;

  try {
    const remaining = await witnessPointTimerService.getRemainingTime(parseInt(id, 10));

    if (!remaining) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ data: remaining });
  } catch (err) {
    console.error('[WitnessPointController] getRemainingTime error:', err);
    const statusCode = getErrorStatusCode(err.message);
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * GET /api/wp-notifications/audit
 * Query the witness point audit trail with filters.
 * Authenticated.
 */
exports.getAuditTrail = async (req, res) => {
  const { instanceId, pointId, status, dateFrom, dateTo, limit, offset } = req.query;

  try {
    const result = await witnessPointService.getAuditTrail({
      instanceId: instanceId ? parseInt(instanceId, 10) : undefined,
      pointId: pointId ? parseInt(pointId, 10) : undefined,
      status,
      dateFrom,
      dateTo,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined
    });

    res.json({ data: result });
  } catch (err) {
    console.error('[WitnessPointController] getAuditTrail error:', err);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
};

/**
 * POST /api/wp-notifications/:id/auto-waive
 * Process auto-waiver for a notification (internal only — called by Lambda timer).
 * Validates with x-internal-secret header matching INTERNAL_API_SECRET env var.
 */
exports.processAutoWaive = async (req, res) => {
  const { id } = req.params;

  // Validate internal secret header
  const internalSecret = req.headers['x-internal-secret'];
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  if (!expectedSecret || internalSecret !== expectedSecret) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const result = await witnessPointTimerService.processAutoWaiver(parseInt(id, 10));

    if (!result) {
      // No-op: notification was already handled (idempotent)
      return res.json({ message: 'No action needed (notification already processed)', data: null });
    }

    res.json({ message: 'Auto-waiver processed', data: result });
  } catch (err) {
    console.error('[WitnessPointController] processAutoWaive error:', err);
    const statusCode = getErrorStatusCode(err.message);
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * GET /api/wp-notifications/token/:token/validate
 * Validate a response token and return notification context.
 * Public endpoint (no auth required).
 */
exports.validateToken = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const db = require('../db');

    // Look up the token with notification and project context
    const result = await db.query(
      `SELECT t.id AS token_id, t.expires_at, t.used_at,
              n.id AS notification_id, n.status, n.planned_inspection_time,
              n.location_description, n.scope_of_work,
              r.recipient_name, r.email AS recipient_email,
              i.name AS itp_name,
              p.description AS point_description,
              proj.name AS project_name
       FROM wp_response_tokens t
       JOIN wp_notifications n ON t.notification_id = n.id
       JOIN wp_notification_recipients r ON t.recipient_id = r.id
       JOIN itp_instances i ON n.itp_instance_id = i.id
       JOIN itp_points p ON n.itp_point_id = p.id
       JOIN projects proj ON i.project_id = proj.id
       WHERE t.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired response link' });
    }

    const data = result.rows[0];

    // Check if token has been used
    if (data.used_at) {
      return res.status(400).json({ error: 'This response link has already been used' });
    }

    // Check if token has expired
    if (new Date() > new Date(data.expires_at)) {
      return res.status(400).json({ error: 'This notification has expired. Response is no longer accepted' });
    }

    // Check if notification is still pending
    if (data.status !== 'Pending') {
      return res.status(400).json({ error: 'This notification has already been responded to or is no longer pending' });
    }

    res.json({
      data: {
        notificationId: data.notification_id,
        projectName: data.project_name,
        itpName: data.itp_name,
        pointDescription: data.point_description,
        plannedInspectionTime: data.planned_inspection_time,
        location: data.location_description,
        scope: data.scope_of_work,
        recipientName: data.recipient_name,
        recipientEmail: data.recipient_email
      }
    });
  } catch (err) {
    console.error('[WitnessPointController] validateToken error:', err);
    res.status(500).json({ error: 'Failed to validate token' });
  }
};

/**
 * POST /api/wp-notifications/token/:token/respond
 * Respond to a notification via a response token.
 * Public endpoint (no auth required).
 */
exports.respondViaToken = async (req, res) => {
  const { token } = req.params;
  const { responseType, reason, requestedTime } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  if (!responseType) {
    return res.status(400).json({ error: 'responseType is required' });
  }

  if (!['confirm', 'decline', 'reschedule'].includes(responseType)) {
    return res.status(400).json({ error: "responseType must be 'confirm', 'decline', or 'reschedule'" });
  }

  if (responseType === 'decline' && !reason) {
    return res.status(400).json({ error: 'reason is required when declining' });
  }

  if (responseType === 'reschedule' && !requestedTime) {
    return res.status(400).json({ error: 'requestedTime is required when requesting a reschedule' });
  }

  try {
    const result = await witnessPointService.respondViaToken(token, {
      responseType,
      reason,
      requestedTime
    });
    res.json({ message: `Notification ${responseType}ed`, data: result });
  } catch (err) {
    console.error('[WitnessPointController] respondViaToken error:', err);
    const statusCode = getErrorStatusCode(err.message);
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * GET /api/projects/:id/wp-config
 * Get the witness point configuration for a project.
 * Authenticated.
 */
exports.getProjectWPConfig = async (req, res) => {
  const { id } = req.params;

  try {
    const config = await witnessPointConfigService.getProjectConfig(parseInt(id, 10));
    const recipients = await witnessPointConfigService.getDefaultRecipients(parseInt(id, 10));

    res.json({ data: { ...config, defaultRecipients: recipients } });
  } catch (err) {
    console.error('[WitnessPointController] getProjectWPConfig error:', err);
    res.status(500).json({ error: 'Failed to fetch project WP configuration' });
  }
};

/**
 * PUT /api/projects/:id/wp-config
 * Update the witness point configuration for a project.
 * Authenticated, role check: Head Contractor (2) or Admin (4) only.
 */
exports.updateProjectWPConfig = async (req, res) => {
  const { id } = req.params;
  const { noticePeriodHours } = req.body;
  const roleId = req.user.roleId;

  // Role check: Only Head Contractors (2) and Admins (4) can update config
  if (![2, 4].includes(roleId)) {
    return res.status(403).json({ error: 'Only Head Contractors and Admins can configure notification settings' });
  }

  if (noticePeriodHours === undefined || noticePeriodHours === null) {
    return res.status(400).json({ error: 'noticePeriodHours is required' });
  }

  try {
    const config = await witnessPointConfigService.updateProjectConfig(parseInt(id, 10), {
      noticePeriodHours: parseInt(noticePeriodHours, 10)
    });

    res.json({ message: 'Configuration updated', data: config });
  } catch (err) {
    console.error('[WitnessPointController] updateProjectWPConfig error:', err);
    const statusCode = getErrorStatusCode(err.message);
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * POST /api/projects/:id/wp-config/recipients
 * Add a default recipient to the project's WP configuration.
 * Authenticated, role check: Head Contractor (2) or Admin (4) only.
 */
exports.addDefaultRecipient = async (req, res) => {
  const { id } = req.params;
  const { userId, email, recipientName, isExternal, roleFilter } = req.body;
  const roleId = req.user.roleId;

  if (![2, 4].includes(roleId)) {
    return res.status(403).json({ error: 'Only Head Contractors and Admins can configure notification settings' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Recipient email is required' });
  }

  try {
    const recipient = await witnessPointConfigService.addDefaultRecipient(parseInt(id, 10), {
      userId: userId || null,
      email,
      recipientName: recipientName || null,
      isExternal: isExternal || false,
      roleFilter: roleFilter || null
    });

    res.status(201).json({ message: 'Recipient added', data: recipient });
  } catch (err) {
    console.error('[WitnessPointController] addDefaultRecipient error:', err);
    const statusCode = getErrorStatusCode(err.message);
    res.status(statusCode).json({ error: err.message });
  }
};

/**
 * DELETE /api/projects/:id/wp-config/recipients/:recipientId
 * Remove a default recipient from the project's WP configuration.
 * Authenticated, role check: Head Contractor (2) or Admin (4) only.
 */
exports.removeDefaultRecipient = async (req, res) => {
  const { recipientId } = req.params;
  const roleId = req.user.roleId;

  if (![2, 4].includes(roleId)) {
    return res.status(403).json({ error: 'Only Head Contractors and Admins can configure notification settings' });
  }

  try {
    await witnessPointConfigService.removeDefaultRecipient(parseInt(recipientId, 10));
    res.json({ message: 'Recipient removed' });
  } catch (err) {
    console.error('[WitnessPointController] removeDefaultRecipient error:', err);
    const statusCode = getErrorStatusCode(err.message);
    res.status(statusCode).json({ error: err.message });
  }
};

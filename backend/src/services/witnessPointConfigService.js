const db = require('../db');

const DEFAULT_NOTICE_PERIOD_HOURS = 24;
const MIN_NOTICE_PERIOD_HOURS = 1;
const MAX_NOTICE_PERIOD_HOURS = 168;

/**
 * Returns the witness point configuration for a project.
 * If no config exists, returns the default (24 hours notice period).
 */
exports.getProjectConfig = async (projectId) => {
  const result = await db.query(
    `SELECT id, project_id, notice_period_hours, created_at, updated_at
     FROM project_wp_config
     WHERE project_id = $1`,
    [projectId]
  );

  if (result.rows.length === 0) {
    return {
      project_id: projectId,
      notice_period_hours: DEFAULT_NOTICE_PERIOD_HOURS,
      is_default: true
    };
  }

  return result.rows[0];
};

/**
 * Updates (or creates) the witness point configuration for a project.
 * Validates that noticePeriodHours is within [1, 168].
 */
exports.updateProjectConfig = async (projectId, { noticePeriodHours }) => {
  if (
    noticePeriodHours == null ||
    !Number.isInteger(noticePeriodHours) ||
    noticePeriodHours < MIN_NOTICE_PERIOD_HOURS ||
    noticePeriodHours > MAX_NOTICE_PERIOD_HOURS
  ) {
    throw new Error(`Notice period must be between ${MIN_NOTICE_PERIOD_HOURS} and ${MAX_NOTICE_PERIOD_HOURS} hours`);
  }

  const result = await db.query(
    `INSERT INTO project_wp_config (project_id, notice_period_hours)
     VALUES ($1, $2)
     ON CONFLICT (project_id)
     DO UPDATE SET notice_period_hours = $2, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [projectId, noticePeriodHours]
  );

  return result.rows[0];
};

/**
 * Returns the list of default recipients configured for a project.
 */
exports.getDefaultRecipients = async (projectId) => {
  const result = await db.query(
    `SELECT dr.id, dr.project_id, dr.user_id, dr.email, dr.recipient_name,
            dr.is_external, dr.role_filter, dr.created_at
     FROM project_wp_default_recipients dr
     WHERE dr.project_id = $1
     ORDER BY dr.created_at ASC`,
    [projectId]
  );

  return result.rows;
};

/**
 * Adds a default recipient to a project's witness point configuration.
 */
exports.addDefaultRecipient = async (projectId, { userId, email, recipientName, isExternal, roleFilter }) => {
  if (!email) {
    throw new Error('Recipient email is required');
  }

  const result = await db.query(
    `INSERT INTO project_wp_default_recipients (project_id, user_id, email, recipient_name, is_external, role_filter)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [projectId, userId || null, email, recipientName || null, isExternal || false, roleFilter || null]
  );

  return result.rows[0];
};

/**
 * Removes a default recipient by its ID.
 */
exports.removeDefaultRecipient = async (recipientId) => {
  const result = await db.query(
    `DELETE FROM project_wp_default_recipients WHERE id = $1 RETURNING *`,
    [recipientId]
  );

  if (result.rows.length === 0) {
    throw new Error('Recipient not found');
  }

  return result.rows[0];
};

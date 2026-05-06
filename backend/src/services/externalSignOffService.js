const crypto = require('crypto');
const db = require('../db');
const emailService = require('./emailService');

const TOKEN_EXPIRY_HOURS = 48;

/**
 * Generates a secure token for external sign-off and notifies the recipient.
 */
exports.requestExternalSignOff = async (pointId, email, roleName, requesterId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Invalidate any existing tokens for this point
    await client.query(
      "UPDATE external_sign_off_tokens SET used_at = CURRENT_TIMESTAMP WHERE itp_point_id = $1 AND used_at IS NULL",
      [pointId]
    );

    const result = await client.query(
      `INSERT INTO external_sign_off_tokens (itp_point_id, token, email, role_name, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [pointId, token, email, roleName, expiresAt]
    );

    // Fetch context for the email
    const contextRes = await client.query(`
      SELECT p.description AS point_description, i.name AS itp_name, proj.name AS project_name, u.full_name AS requester_name
      FROM itp_points p
      JOIN itp_instances i ON p.instance_id = i.id
      JOIN projects proj ON i.project_id = proj.id
      JOIN users u ON u.id = $2
      WHERE p.id = $1
    `, [pointId, requesterId]);

    const ctx = contextRes.rows[0];

    // Send the email
    await emailService.sendExternalSignOffEmail(email, token, {
      pointDescription: ctx.point_description,
      itpName: ctx.itp_name,
      projectName: ctx.project_name,
      roleName: roleName,
      requesterName: ctx.requester_name
    });

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Validates an external sign-off token.
 */
exports.validateToken = async (token) => {
  const result = await db.query(
    `SELECT t.*, p.description AS point_description, p.status AS point_status, i.name AS itp_name
     FROM external_sign_off_tokens t
     JOIN itp_points p ON t.itp_point_id = p.id
     JOIN itp_instances i ON p.instance_id = i.id
     WHERE t.token = $1 AND t.used_at IS NULL AND t.expires_at > CURRENT_TIMESTAMP`,
    [token]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired token');
  }

  return result.rows[0];
};

/**
 * Performs the sign-off using the token.
 */
exports.executeExternalSignOff = async (token, status, comments) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const tokenData = await this.validateToken(token);
    const pointId = tokenData.itp_point_id;

    // Fetch point details for validation
    const pointRes = await client.query(
      `SELECT p.*, i.status AS instance_status
       FROM itp_points p
       JOIN itp_instances i ON p.instance_id = i.id
       WHERE p.id = $1`,
      [pointId]
    );
    const point = pointRes.rows[0];

    // Validate ITP is Open
    if (point.instance_status !== 'Open') {
      throw new Error(`Cannot sign off. ITP must be Open. Current status: ${point.instance_status}`);
    }

    // Hold point enforcement: check for unsigned HPs above this point
    const blockingHP = await client.query(
      "SELECT sequence FROM itp_points WHERE instance_id = $1 AND sequence < $2 AND type = 'HP' AND status NOT IN ('Approved', 'Closed')",
      [point.instance_id, point.sequence]
    );
    if (blockingHP.rows.length > 0) {
      throw new Error(`Cannot sign off. Preceding Hold Point (sequence ${blockingHP.rows[0].sequence}) must be signed off first.`);
    }

    // Open NCR blocking for Approved status
    if (status === 'Approved') {
      const openNCRs = await client.query(
        "SELECT id FROM ncr_defects WHERE itp_point_id = $1 AND status NOT IN ('Verified', 'Closed')",
        [pointId]
      );
      if (openNCRs.rows.length > 0) {
        throw new Error('Cannot approve. There is an unresolved NCR linked to this inspection point.');
      }
    }

    // Update the ITP point
    await client.query(
      `UPDATE itp_points
       SET status = $1,
           comments = $2,
           is_external_sign_off = true,
           external_signer_email = $3,
           signed_off_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [status, comments, tokenData.email, pointId]
    );

    // Mark token as used
    await client.query(
      'UPDATE external_sign_off_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1',
      [token]
    );

    // Audit log (user_id is NULL for external sign-off)
    await client.query(
      `INSERT INTO audit_logs (itp_instance_id, itp_point_id, action, old_status, new_status, metadata)
       SELECT instance_id, id, 'EXTERNAL_SIGN_OFF', status, $1, $2
       FROM itp_points WHERE id = $3`,
      [status, JSON.stringify({ email: tokenData.email, role: tokenData.role_name, comments }), pointId]
    );

    // Auto-close ITP when all points signed off
    const pendingPoints = await client.query(
      "SELECT COUNT(*) FROM itp_points WHERE instance_id = $1 AND status NOT IN ('Approved', 'Closed')",
      [point.instance_id]
    );
    if (parseInt(pendingPoints.rows[0].count) === 0) {
      await client.query(
        "UPDATE itp_instances SET status = 'Closed' WHERE id = $1",
        [point.instance_id]
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const db = require('../db');
const reportService = require('../services/reportService');
const { ROLES, ROLE_NAMES } = require('../constants/roles');

const logAudit = async (client, { itp_instance_id, itp_point_id, user_id, action, old_status, new_status, metadata }) => {
  await client.query(
    'INSERT INTO audit_logs (itp_instance_id, itp_point_id, user_id, action, old_status, new_status, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [itp_instance_id, itp_point_id, user_id, action, old_status, new_status, metadata]
  );
};

exports.createInstance = async (req, res) => {
  const { template_id, project_id, name, lot_number, revision, drawing_ref, panel_no } = req.body;
  const user_id = req.user.userId;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Duplicate check: same name in same project
    const existing = await client.query(
      'SELECT id FROM itp_instances WHERE project_id = $1 AND LOWER(name) = LOWER($2)',
      [project_id, name]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(409).json({ error: `An ITP named "${name}" already exists in this project. Use a different name.` });
    }

    const templatePoints = await client.query(
      'SELECT * FROM itp_template_points WHERE template_id = $1 ORDER BY sequence',
      [template_id]
    );

    if (templatePoints.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'Template has no points. Add points to the template before creating an ITP instance.' });
    }

    // Start as Draft — requires HC/Admin approval before execution
    const instanceResult = await client.query(
      'INSERT INTO itp_instances (template_id, project_id, name, created_by, status, lot_number, revision, drawing_ref, panel_no) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [template_id, project_id, name, user_id, 'Draft', lot_number, revision, drawing_ref, panel_no]
    );
    const instanceId = instanceResult.rows[0].id;

    for (const tp of templatePoints.rows) {
      await client.query(
        'INSERT INTO itp_points (instance_id, sequence, description, type, status, acceptance_criteria, reference_documents, inspection_method, frequency, responsible_party, section, verifying_records, approver_role_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
        [instanceId, tp.sequence, tp.description, tp.type, 'Open', tp.acceptance_criteria, tp.reference_documents, tp.inspection_method, tp.frequency, tp.responsible_party, tp.section, tp.verifying_records, tp.approver_role_id]
      );
    }

    await logAudit(client, {
      itp_instance_id: instanceId,
      user_id,
      action: 'CREATE_INSTANCE',
      new_status: 'Draft',
      metadata: { template_id, project_id, name }
    });

    await client.query('COMMIT');
    res.status(201).json(instanceResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create ITP instance: ' + err.message });
  } finally {
    client.release();
  }
};

exports.getInstances = async (req, res) => {
  const { project_id } = req.query;
  try {
    let query = 'SELECT * FROM itp_instances ORDER BY created_at DESC';
    let params = [];
    if (project_id) {
      query = 'SELECT * FROM itp_instances WHERE project_id = $1 ORDER BY created_at DESC';
      params.push(project_id);
    }
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch instances' });
  }
};

exports.getInstanceById = async (req, res) => {
  const { id } = req.params;
  try {
    const instanceResult = await db.query('SELECT * FROM itp_instances WHERE id = $1', [id]);
    if (instanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    // Single query: points + signer info + aggregated NCRs.
    // Eliminates the N×2 fan-out the frontend was doing (one request per point).
    const pointsResult = await db.query(
      `SELECT
         p.*,
         u.full_name  AS signed_off_by_name,
         u.email     AS signed_off_by_email,
         r.name      AS signed_off_by_role,
         est.email   AS pending_external_email,
         est.role_name AS pending_external_role,
         est.expires_at AS pending_external_expires,
         COALESCE(
           json_agg(
             json_build_object(
               'id',          n.id,
               'description', n.description,
               'status',      n.status,
               'created_at',  n.created_at
             ) ORDER BY n.created_at
           ) FILTER (WHERE n.id IS NOT NULL),
           '[]'
         ) AS ncrs
       FROM itp_points p
       LEFT JOIN users       u ON p.signed_off_by  = u.id
       LEFT JOIN roles       r ON u.role_id         = r.id
       LEFT JOIN ncr_defects n ON n.itp_point_id    = p.id
       LEFT JOIN external_sign_off_tokens est ON est.itp_point_id = p.id AND est.used_at IS NULL AND est.expires_at > CURRENT_TIMESTAMP
       WHERE p.instance_id = $1
       GROUP BY p.id, u.full_name, u.email, r.name, est.email, est.role_name, est.expires_at
       ORDER BY p.sequence`,
      [id]
    );

    res.json({ ...instanceResult.rows[0], points: pointsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch instance' });
  }
};

// Feature 2: Submit a Draft ITP for review by HC/Admin
exports.submitForReview = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const instanceResult = await client.query('SELECT * FROM itp_instances WHERE id = $1', [id]);
    if (instanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    const instance = instanceResult.rows[0];

    if (instance.status !== 'Draft') {
      return res.status(400).json({ error: `ITP is already ${instance.status}. Only Draft ITPs can be submitted for review.` });
    }

    await client.query(
      "UPDATE itp_instances SET status = 'Pending Review' WHERE id = $1",
      [id]
    );

    await logAudit(client, {
      itp_instance_id: parseInt(id),
      user_id,
      action: 'SUBMIT_FOR_REVIEW',
      old_status: 'Draft',
      new_status: 'Pending Review'
    });

    await client.query('COMMIT');
    res.json({ message: 'ITP submitted for review' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to submit ITP for review' });
  } finally {
    client.release();
  }
};

// Feature 2: Approve a Pending Review ITP → Open (HC / Admin only, enforced in route)
exports.approveITP = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const instanceResult = await client.query('SELECT * FROM itp_instances WHERE id = $1', [id]);
    if (instanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    const instance = instanceResult.rows[0];

    if (instance.status !== 'Pending Review') {
      return res.status(400).json({ error: `ITP must be in Pending Review status. Current status: ${instance.status}` });
    }

    await client.query(
      "UPDATE itp_instances SET status = 'Open' WHERE id = $1",
      [id]
    );

    await logAudit(client, {
      itp_instance_id: parseInt(id),
      user_id,
      action: 'APPROVE_ITP',
      old_status: 'Pending Review',
      new_status: 'Open'
    });

    await client.query('COMMIT');
    res.json({ message: 'ITP approved and is now Open for execution' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to approve ITP' });
  } finally {
    client.release();
  }
};

// Feature 2: Reject a Pending Review ITP → back to Draft
exports.rejectITP = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user_id = req.user.userId;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const instanceResult = await client.query('SELECT * FROM itp_instances WHERE id = $1', [id]);
    if (instanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    const instance = instanceResult.rows[0];

    if (instance.status !== 'Pending Review') {
      return res.status(400).json({ error: `Only Pending Review ITPs can be rejected. Current status: ${instance.status}` });
    }

    await client.query(
      "UPDATE itp_instances SET status = 'Draft', closure_notes = $2 WHERE id = $1",
      [id, reason || null]
    );

    await logAudit(client, {
      itp_instance_id: parseInt(id),
      user_id,
      action: 'REJECT_ITP',
      old_status: 'Pending Review',
      new_status: 'Draft',
      metadata: { reason }
    });

    await client.query('COMMIT');
    res.json({ message: 'ITP rejected and returned to Draft' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to reject ITP' });
  } finally {
    client.release();
  }
};

exports.signOffPoint = async (req, res) => {
  const { id } = req.params;
  const { status, comments } = req.body;
  const user_id = req.user.userId;
  const user_role_id = req.user.roleId;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const pointResult = await client.query('SELECT * FROM itp_points WHERE id = $1', [id]);
    if (pointResult.rows.length === 0) {
      return res.status(404).json({ error: 'Point not found' });
    }
    const point = pointResult.rows[0];
    const instanceId = point.instance_id;

    // Feature 2: ITP must be Open before any sign-off
    const instanceResult = await client.query('SELECT * FROM itp_instances WHERE id = $1', [instanceId]);
    const instance = instanceResult.rows[0];
    if (instance.status !== 'Open') {
      return res.status(400).json({
        error: `Cannot sign off points. ITP must be Open. Current status: ${instance.status}.${instance.status === 'Draft' ? ' Submit for review first.' : instance.status === 'Pending Review' ? ' Awaiting HC/Admin approval.' : ''}`
      });
    }

    // Feature 1: Role-based sign-off enforcement
    // Admin can always sign off. Otherwise check approver_role_id if set.
    if (point.approver_role_id && user_role_id !== ROLES.ADMIN && user_role_id !== point.approver_role_id) {
      const required = ROLE_NAMES[point.approver_role_id] || `Role ${point.approver_role_id}`;
      const current = ROLE_NAMES[user_role_id] || `Role ${user_role_id}`;
      return res.status(403).json({
        error: `This point requires a ${required} sign-off. Your role is ${current}.`
      });
    }

    // Preceding HP blocking
    const blockingHP = await client.query(
      "SELECT * FROM itp_points WHERE instance_id = $1 AND sequence < $2 AND type = 'HP' AND status NOT IN ('Approved', 'Closed')",
      [instanceId, point.sequence]
    );

    if (blockingHP.rows.length > 0) {
      return res.status(400).json({
        error: `Cannot sign off point. Preceding Hold Point (HP) sequence ${blockingHP.rows[0].sequence} must be signed off first.`
      });
    }

    // Open NCR blocking for Approved status
    const openNCRs = await client.query(
      "SELECT * FROM ncr_defects WHERE itp_point_id = $1 AND status NOT IN ('Verified', 'Closed')",
      [id]
    );

    if (openNCRs.rows.length > 0 && status === 'Approved') {
      return res.status(400).json({
        error: 'Cannot approve point. There is an unresolved NCR linked to this inspection point.'
      });
    }

    // Only overwrite comments when the caller provides a meaningful value.
    // This preserves prior rejection comments when a point is re-approved.
    const shouldUpdateComments = comments && comments !== 'Signed off from web interface';

    const updateResult = await client.query(
      `UPDATE itp_points
         SET status = $1,
             signed_off_by = $2,
             signed_off_at = CURRENT_TIMESTAMP,
             comments = CASE WHEN $5 THEN $3 ELSE comments END
       WHERE id = $4 RETURNING *`,
      [status, user_id, comments, id, shouldUpdateComments]
    );

    // Query notification status for audit metadata (Requirement 8.4)
    const wpNotificationResult = await client.query(
      'SELECT status FROM wp_notifications WHERE itp_point_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    );
    const wpNotificationStatus = wpNotificationResult.rows[0]?.status || null;

    await logAudit(client, {
      itp_instance_id: instanceId,
      itp_point_id: id,
      user_id,
      action: 'SIGN_OFF_POINT',
      old_status: point.status,
      new_status: status,
      metadata: { comments, wp_notification_status: wpNotificationStatus }
    });

    // Auto-close ITP when all points signed off
    const pendingPoints = await client.query(
      "SELECT COUNT(*) FROM itp_points WHERE instance_id = $1 AND status NOT IN ('Approved', 'Closed')",
      [instanceId]
    );

    if (parseInt(pendingPoints.rows[0].count) === 0) {
      await client.query(
        "UPDATE itp_instances SET status = 'Closed' WHERE id = $1",
        [instanceId]
      );
      await logAudit(client, {
        itp_instance_id: instanceId,
        user_id,
        action: 'CLOSE_INSTANCE',
        old_status: 'Open',
        new_status: 'Closed'
      });

      setImmediate(async () => {
        try {
          const pdfPath = await reportService.generateITPReport(instanceId);
          const instRes = await db.query('SELECT name FROM itp_instances WHERE id = $1', [instanceId]);
          await reportService.sendReportEmail(pdfPath, instRes.rows[0].name);
        } catch (reportErr) {
          console.error('Automated reporting failed:', reportErr);
        }
      });
    }

    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to sign off point: ' + err.message });
  } finally {
    client.release();
  }
};

// Feature 4: On-demand PDF export
exports.exportReport = async (req, res) => {
  const { id } = req.params;
  try {
    const instanceResult = await db.query('SELECT * FROM itp_instances WHERE id = $1', [id]);
    if (instanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    const pdfBuffer = await reportService.generateITPReportBuffer(parseInt(id));
    const instance = instanceResult.rows[0];
    const filename = `ITP_${instance.name.replace(/[^a-z0-9]/gi, '_')}_${id}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF export failed:', err);
    res.status(500).json({ error: 'Failed to generate report: ' + err.message });
  }
};

// Deactivate (close) an ITP instance
exports.deactivateInstance = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const instanceResult = await client.query('SELECT * FROM itp_instances WHERE id = $1', [id]);
    if (instanceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Instance not found' });
    }
    const instance = instanceResult.rows[0];

    if (instance.status === 'Closed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ITP is already closed.' });
    }

    await client.query(
      "UPDATE itp_instances SET status = 'Closed', closure_notes = 'Deactivated by user' WHERE id = $1",
      [id]
    );

    await logAudit(client, {
      itp_instance_id: parseInt(id),
      user_id,
      action: 'DEACTIVATE_INSTANCE',
      old_status: instance.status,
      new_status: 'Closed',
      metadata: { reason: 'Manual deactivation' }
    });

    await client.query('COMMIT');
    res.json({ message: 'ITP deactivated' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to deactivate ITP' });
  } finally {
    client.release();
  }
};

// POC: Permanently delete an ITP instance and all related data
exports.deleteInstance = async (req, res) => {
  const { id } = req.params;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const instanceResult = await client.query('SELECT id FROM itp_instances WHERE id = $1', [id]);
    if (instanceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Instance not found' });
    }

    // Get all point IDs
    const points = await client.query('SELECT id FROM itp_points WHERE instance_id = $1', [id]);
    const pointIds = points.rows.map(r => r.id);

    if (pointIds.length > 0) {
      await client.query('DELETE FROM ncr_defects WHERE itp_point_id = ANY($1)', [pointIds]);
      await client.query('DELETE FROM media WHERE itp_point_id = ANY($1)', [pointIds]);
      await client.query('DELETE FROM external_sign_off_tokens WHERE itp_point_id = ANY($1)', [pointIds]);
      await client.query('DELETE FROM wp_auto_waivers WHERE itp_point_id = ANY($1)', [pointIds]);
    }

    // Delete WP notifications
    const wpNotifs = await client.query('SELECT id FROM wp_notifications WHERE itp_instance_id = $1', [id]);
    const wpNotifIds = wpNotifs.rows.map(r => r.id);
    if (wpNotifIds.length > 0) {
      await client.query('DELETE FROM wp_response_tokens WHERE notification_id = ANY($1)', [wpNotifIds]);
      await client.query('DELETE FROM wp_notification_recipients WHERE notification_id = ANY($1)', [wpNotifIds]);
      await client.query('DELETE FROM wp_notifications WHERE id = ANY($1)', [wpNotifIds]);
    }

    // Delete audit logs, points, instance
    await client.query('DELETE FROM audit_logs WHERE itp_instance_id = $1', [id]);
    await client.query('DELETE FROM itp_points WHERE instance_id = $1', [id]);
    await client.query('DELETE FROM itp_instances WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: 'ITP instance permanently deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to delete ITP: ' + err.message });
  } finally {
    client.release();
  }
};

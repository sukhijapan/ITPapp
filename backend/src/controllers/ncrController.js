const db = require('../db');
const { notifyNCRCreated } = require('../services/notificationService');

// GET /api/ncrs — list all NCRs with context (point, instance, project, author)
exports.getAllNCRs = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        n.id,
        n.title,
        n.description,
        n.status,
        n.created_at,
        n.resolved_at,
        n.itp_point_id,
        p.sequence       AS point_sequence,
        p.description    AS point_description,
        p.type           AS point_type,
        p.status         AS point_status,
        i.id             AS instance_id,
        i.name           AS instance_name,
        i.lot_number,
        i.panel_no,
        proj.id          AS project_id,
        proj.name        AS project_name,
        u.full_name       AS created_by_name,
        r.name           AS created_by_role
      FROM ncr_defects n
      JOIN itp_points    p    ON n.itp_point_id = p.id
      JOIN itp_instances i    ON p.instance_id  = i.id
      JOIN projects      proj ON i.project_id   = proj.id
      LEFT JOIN users    u    ON n.created_by    = u.id
      LEFT JOIN roles    r    ON u.role_id       = r.id
      ORDER BY
        CASE n.status WHEN 'Open' THEN 0 WHEN 'Resolved' THEN 1 WHEN 'Verified' THEN 2 ELSE 3 END,
        n.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch NCRs' });
  }
};

// GET /api/ncrs/:id — single NCR with full detail
exports.getNCRById = async (req, res) => {
  const { id } = req.params;
  try {
    const ncrResult = await db.query(`
      SELECT
        n.*,
        p.sequence       AS point_sequence,
        p.description    AS point_description,
        p.type           AS point_type,
        p.status         AS point_status,
        p.acceptance_criteria,
        p.reference_documents,
        p.section        AS point_section,
        p.signed_off_by,
        p.signed_off_at,
        p.comments       AS point_comments,
        i.id             AS instance_id,
        i.name           AS instance_name,
        i.status         AS instance_status,
        i.lot_number,
        i.panel_no,
        i.revision,
        i.drawing_ref,
        proj.id          AS project_id,
        proj.name        AS project_name,
        cu.full_name      AS created_by_name,
        cu.email         AS created_by_email,
        cr.name          AS created_by_role,
        su.full_name      AS signed_off_by_name,
        sr.name          AS signed_off_by_role
      FROM ncr_defects n
      JOIN itp_points    p    ON n.itp_point_id = p.id
      JOIN itp_instances i    ON p.instance_id  = i.id
      JOIN projects      proj ON i.project_id   = proj.id
      LEFT JOIN users    cu   ON n.created_by    = cu.id
      LEFT JOIN roles    cr   ON cu.role_id      = cr.id
      LEFT JOIN users    su   ON p.signed_off_by = su.id
      LEFT JOIN roles    sr   ON su.role_id      = sr.id
      WHERE n.id = $1
    `, [id]);

    if (ncrResult.rows.length === 0) {
      return res.status(404).json({ error: 'NCR not found' });
    }

    // Fetch audit trail in the same round-trip using a CTE
    const auditResult = await db.query(`
      SELECT a.id, a.action, a.new_status, a.metadata, a.timestamp, u.full_name
      FROM audit_logs a
      JOIN users u ON a.user_id = u.id
      WHERE a.itp_point_id = $1
      ORDER BY a.timestamp
    `, [ncrResult.rows[0].itp_point_id]);

    res.json({ ...ncrResult.rows[0], audit_trail: auditResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch NCR' });
  }
};

exports.createNCR = async (req, res) => {
  const { itp_point_id, description } = req.body;
  const title = description; // NCR title defaults to the description on creation
  const user_id = req.user.userId;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create the NCR
    const ncrResult = await client.query(
      'INSERT INTO ncr_defects (itp_point_id, description, title, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [itp_point_id, description, title, user_id]
    );

    // 2. Update the ITP point status to 'Rejected' and record who rejected it
    await client.query(
      `UPDATE itp_points
         SET status = 'Rejected',
             signed_off_by = $2,
             signed_off_at = CURRENT_TIMESTAMP,
             comments = $3
       WHERE id = $1`,
      [itp_point_id, user_id, description]
    );

    // 3. Log Audit
    await client.query(
      'INSERT INTO audit_logs (itp_instance_id, itp_point_id, user_id, action, new_status, metadata) SELECT instance_id, id, $2, \'CREATE_NCR\', \'Rejected\', $3 FROM itp_points WHERE id = $1',
      [itp_point_id, user_id, JSON.stringify({ ncr_id: ncrResult.rows[0].id, description })]
    );

    await client.query('COMMIT');

    // Send notification (non-blocking — don't fail the request if it errors)
    const contextRes = await db.query(`
      SELECT p.description AS point_description, p.type AS point_type,
             i.id AS instance_id, i.name AS itp_name, i.lot_number, i.panel_no,
             proj.name AS project_name, u.full_name AS raised_by
      FROM itp_points p
      JOIN itp_instances i ON p.instance_id = i.id
      JOIN projects proj ON i.project_id = proj.id
      LEFT JOIN users u ON u.id = $2
      WHERE p.id = $1
    `, [itp_point_id, user_id]);

    if (contextRes.rows.length > 0) {
      const ctx = contextRes.rows[0];
      notifyNCRCreated({
        ncrId: ncrResult.rows[0].id,
        title: description,
        description,
        pointDescription: ctx.point_description,
        pointType: ctx.point_type,
        instanceId: ctx.instance_id,
        itpName: ctx.itp_name,
        projectName: ctx.project_name,
        lotNumber: ctx.lot_number,
        panelNo: ctx.panel_no,
        raisedBy: ctx.raised_by || 'Unknown',
      }).catch(err => console.error('[Notify] Notification error:', err));
    }

    res.status(201).json(ncrResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create NCR' });
  } finally {
    client.release();
  }
};

exports.resolveNCR = async (req, res) => {
  const { id } = req.params;
  try {
    // Move directly to 'Closed' so the NCR no longer blocks HP sign-off.
    // The sign-off query checks: status NOT IN ('Verified', 'Closed').
    // Previously this set status to 'Resolved' which still blocked approval.
    const result = await db.query(
      'UPDATE ncr_defects SET status = \'Closed\', resolved_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resolve NCR' });
  }
};

// PUT /api/ncrs/:id — update NCR detail fields
exports.updateNCR = async (req, res) => {
  const { id } = req.params;
  const {
    description, category, reported_to, client_contact, contractor_contact,
    root_cause, proposed_disposition, proposed_completion_date,
    corrective_action, rectification_complete, verified_by_contractor,
    verified_by_client, closing_remarks,
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE ncr_defects SET
         description = COALESCE($2, description),
         category = $3,
         reported_to = $4,
         client_contact = $5,
         contractor_contact = $6,
         root_cause = $7,
         proposed_disposition = $8,
         proposed_completion_date = $9,
         corrective_action = $10,
         rectification_complete = $11,
         verified_by_contractor = $12,
         verified_by_client = $13,
         closing_remarks = $14
       WHERE id = $1 RETURNING *`,
      [id, description, category, reported_to, client_contact, contractor_contact,
       root_cause, proposed_disposition, proposed_completion_date,
       corrective_action, rectification_complete, verified_by_contractor,
       verified_by_client, closing_remarks]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NCR not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update NCR' });
  }
};

exports.getNCRsByPoint = async (req, res) => {
  const { itp_point_id } = req.params;
  try {
    const result = await db.query('SELECT * FROM ncr_defects WHERE itp_point_id = $1', [itp_point_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch NCRs' });
  }
};

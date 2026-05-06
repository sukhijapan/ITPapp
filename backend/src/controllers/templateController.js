const db = require('../db');

exports.createTemplate = async (req, res) => {
  const { project_id, name, description, points, trade_category, is_public, version, created_by_org } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Duplicate check: same name in same project
    if (project_id) {
      const existing = await client.query(
        'SELECT id FROM itp_templates WHERE project_id = $1 AND LOWER(name) = LOWER($2)',
        [project_id, name]
      );
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(409).json({ error: `A template named "${name}" already exists in this project.` });
      }
    }

    const templateResult = await client.query(
      'INSERT INTO itp_templates (project_id, name, description, trade_category, is_public, version, created_by_org) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [project_id || null, name, description, trade_category || null, is_public || false, version || '1.0', created_by_org || null]
    );
    const templateId = templateResult.rows[0].id;

    if (points && points.length > 0) {
      for (const point of points) {
        await client.query(
          'INSERT INTO itp_template_points (template_id, sequence, description, type, acceptance_criteria, reference_documents, inspection_method, frequency, responsible_party, section, verifying_records, approver_role_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [templateId, point.sequence, point.description, point.type, point.acceptance_criteria, point.reference_documents, point.inspection_method, point.frequency, point.responsible_party, point.section, point.verifying_records, point.approver_role_id || null]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ ...templateResult.rows[0], points });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Template creation failed' });
  } finally {
    client.release();
  }
};

exports.getLibrary = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM itp_templates WHERE is_public = true ORDER BY clone_count DESC, trade_category'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch library' });
  }
};

exports.cloneTemplate = async (req, res) => {
  const { id } = req.params;
  const { project_id } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch original template + points in one query
    const templateRes = await client.query('SELECT * FROM itp_templates WHERE id = $1', [id]);
    if (templateRes.rows.length === 0) throw new Error('Template not found');
    const old = templateRes.rows[0];

    const pointsRes = await client.query(
      'SELECT * FROM itp_template_points WHERE template_id = $1 ORDER BY sequence',
      [id]
    );
    const oldPoints = pointsRes.rows;

    // 2. Create clone
    const newTemplateRes = await client.query(
      'INSERT INTO itp_templates (project_id, name, description, trade_category, is_public) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [project_id, old.name, old.description, old.trade_category, false]
    );
    const newId = newTemplateRes.rows[0].id;

    // 3. Clone points
    for (const p of oldPoints) {
      await client.query(
        'INSERT INTO itp_template_points (template_id, sequence, description, type, acceptance_criteria, reference_documents, inspection_method, frequency, responsible_party, section, verifying_records, approver_role_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        [newId, p.sequence, p.description, p.type, p.acceptance_criteria, p.reference_documents, p.inspection_method, p.frequency, p.responsible_party, p.section, p.verifying_records, p.approver_role_id]
      );
    }

    // 4. Update clone count
    await client.query('UPDATE itp_templates SET clone_count = clone_count + 1 WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.status(201).json(newTemplateRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Cloning failed: ' + err.message });
  } finally {
    client.release();
  }
};

exports.publishToLibrary = async (req, res) => {
  const { id } = req.params;
  const { trade_category, version, created_by_org } = req.body;
  try {
    const result = await db.query(
      'UPDATE itp_templates SET is_public = true, project_id = NULL, trade_category = $1, version = $2, created_by_org = $3 WHERE id = $4 RETURNING *',
      [trade_category, version || '1.0', created_by_org, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Publishing failed' });
  }
};

exports.getTemplates = async (req, res) => {
  const { project_id } = req.query;
  try {
    let query = 'SELECT * FROM itp_templates';
    let params = [];
    if (project_id) {
      query += ' WHERE project_id = $1';
      params.push(project_id);
    }
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

exports.getTemplateById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT
        t.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'sequence', p.sequence,
              'description', p.description,
              'type', p.type,
              'acceptance_criteria', p.acceptance_criteria,
              'reference_documents', p.reference_documents,
              'inspection_method', p.inspection_method,
              'frequency', p.frequency,
              'responsible_party', p.responsible_party,
              'section', p.section,
              'verifying_records', p.verifying_records,
              'approver_role_id', p.approver_role_id
            ) ORDER BY p.sequence
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS points
      FROM itp_templates t
      LEFT JOIN itp_template_points p ON p.template_id = t.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
};

exports.deleteTemplate = async (req, res) => {
  const { id } = req.params;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // POC: Force delete — cascade through instances, points, NCRs, media, audit logs
    // Get all instances using this template
    const instances = await client.query('SELECT id FROM itp_instances WHERE template_id = $1', [id]);
    const instanceIds = instances.rows.map(r => r.id);

    if (instanceIds.length > 0) {
      // Get all point IDs for these instances
      const points = await client.query('SELECT id FROM itp_points WHERE instance_id = ANY($1)', [instanceIds]);
      const pointIds = points.rows.map(r => r.id);

      if (pointIds.length > 0) {
        // Delete NCRs, media, external sign-off tokens, WP notifications linked to points
        await client.query('DELETE FROM ncr_defects WHERE itp_point_id = ANY($1)', [pointIds]);
        await client.query('DELETE FROM media WHERE itp_point_id = ANY($1)', [pointIds]);
        await client.query('DELETE FROM external_sign_off_tokens WHERE itp_point_id = ANY($1)', [pointIds]);
        await client.query('DELETE FROM wp_auto_waivers WHERE itp_point_id = ANY($1)', [pointIds]);
      }

      // Delete WP notification recipients and tokens via notification IDs
      const wpNotifs = await client.query('SELECT id FROM wp_notifications WHERE itp_instance_id = ANY($1)', [instanceIds]);
      const wpNotifIds = wpNotifs.rows.map(r => r.id);
      if (wpNotifIds.length > 0) {
        await client.query('DELETE FROM wp_response_tokens WHERE notification_id = ANY($1)', [wpNotifIds]);
        await client.query('DELETE FROM wp_notification_recipients WHERE notification_id = ANY($1)', [wpNotifIds]);
        await client.query('DELETE FROM wp_notifications WHERE id = ANY($1)', [wpNotifIds]);
      }

      // Delete audit logs, points, instances
      await client.query('DELETE FROM audit_logs WHERE itp_instance_id = ANY($1)', [instanceIds]);
      await client.query('DELETE FROM itp_points WHERE instance_id = ANY($1)', [instanceIds]);
      await client.query('DELETE FROM itp_instances WHERE id = ANY($1)', [instanceIds]);
    }

    // Delete template points and template
    await client.query('DELETE FROM itp_template_points WHERE template_id = $1', [id]);
    const result = await client.query('DELETE FROM itp_templates WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Template not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Template and all related data permanently deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to delete template: ' + err.message });
  } finally {
    client.release();
  }
};

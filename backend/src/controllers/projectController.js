const db = require('../db');
const reportTemplateService = require('../services/reportTemplateService');

exports.createProject = async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Project creation failed' });
  }
};

exports.getProjects = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 50));
  const offset = (page - 1) * pageSize;

  try {
    const [dataRes, countRes] = await Promise.all([
      db.query('SELECT * FROM projects ORDER BY created_at DESC LIMIT $1 OFFSET $2', [pageSize, offset]),
      db.query('SELECT COUNT(*) FROM projects'),
    ]);
    const total = parseInt(countRes.rows[0].count);
    res.json({ data: dataRes.rows, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

exports.getProjectById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// Feature 5: Aggregated stats across all projects (or filtered by project)
exports.getStats = async (req, res) => {
  const { project_id } = req.query;
  try {
    const filter = project_id ? 'WHERE i.project_id = $1' : '';
    const params = project_id ? [project_id] : [];

    const itpStats = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE i.status = 'Draft')          AS draft_itps,
        COUNT(*) FILTER (WHERE i.status = 'Pending Review') AS pending_itps,
        COUNT(*) FILTER (WHERE i.status = 'Open')           AS open_itps,
        COUNT(*) FILTER (WHERE i.status = 'Closed')         AS closed_itps,
        COUNT(*)                                             AS total_itps
      FROM itp_instances i ${filter}`, params);

    const hpStats = await db.query(`
      SELECT COUNT(*) AS blocking_hps
      FROM itp_points p
      JOIN itp_instances i ON p.instance_id = i.id
      WHERE p.type = 'HP' AND p.status = 'Open' AND i.status = 'Open'
      ${project_id ? 'AND i.project_id = $1' : ''}`, params);

    const ncrStats = await db.query(`
      SELECT COUNT(*) AS open_ncrs
      FROM ncr_defects n
      JOIN itp_points p ON n.itp_point_id = p.id
      JOIN itp_instances i ON p.instance_id = i.id
      WHERE n.status = 'Open'
      ${project_id ? 'AND i.project_id = $1' : ''}`, params);

    res.json({
      ...itpStats.rows[0],
      ...hpStats.rows[0],
      ...ncrStats.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

exports.updateReportConfig = async (req, res) => {
  const { id } = req.params;
  const { companyName, docNumberPrefix, defaultRevision, projectSubtitle } = req.body;

  const config = { companyName, docNumberPrefix, defaultRevision, projectSubtitle };

  try {
    const updatedConfig = await reportTemplateService.updateReportConfig(id, config);
    res.status(200).json(updatedConfig);
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    if (err.statusCode === 404) {
      return res.status(404).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update report configuration' });
  }
};

exports.getReportConfig = async (req, res) => {
  const { id } = req.params;

  try {
    const config = await reportTemplateService.getResolvedConfig(id);
    res.status(200).json(config);
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch report configuration' });
  }
};

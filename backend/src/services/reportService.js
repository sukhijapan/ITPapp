const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { buildProfessionalPdf } = require('./professionalPdfBuilder');
const reportTemplateService = require('./reportTemplateService');
const logoService = require('./logoService');

// ── Shared data fetcher ─────────────────────────────────────────────────────

const fetchReportData = async (instanceId) => {
  const instanceRes = await db.query(
    'SELECT i.*, p.name as project_name FROM itp_instances i JOIN projects p ON i.project_id = p.id WHERE i.id = $1',
    [instanceId]
  );
  const instance = instanceRes.rows[0];
  if (!instance) throw new Error(`ITP instance ${instanceId} not found`);

  const pointsRes = await db.query(`
    SELECT pt.*, u.full_name as sign_off_by_name, r.name as sign_off_by_role
    FROM itp_points pt
    LEFT JOIN users u ON pt.signed_off_by = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE pt.instance_id = $1 ORDER BY pt.sequence`, [instanceId]);

  const ncrRes = await db.query(`
    SELECT n.*, p.sequence as point_seq
    FROM ncr_defects n
    JOIN itp_points p ON n.itp_point_id = p.id
    WHERE p.instance_id = $1
    ORDER BY n.created_at`, [instanceId]);

  const auditRes = await db.query(`
    SELECT a.*, u.full_name
    FROM audit_logs a
    JOIN users u ON a.user_id = u.id
    WHERE a.itp_instance_id = $1 ORDER BY a.timestamp`, [instanceId]);

  return {
    instance,
    points: pointsRes.rows,
    ncrs: ncrRes.rows,
    logs: auditRes.rows,
  };
};

// ── Public API ──────────────────────────────────────────────────────────────

const generateITPReportBuffer = async (instanceId) => {
  const data = await fetchReportData(instanceId);

  // Fetch report config and logo for professional PDF
  // Wrap in try/catch to ensure backward compatibility — if config/logo
  // fetching fails, use sensible defaults so the report still generates.
  let config;
  let logoBase64 = null;

  try {
    config = await reportTemplateService.getResolvedConfig(data.instance.project_id);
  } catch (err) {
    console.warn('[ReportService] Failed to fetch report config, using defaults:', err.message);
    config = {
      companyName: data.instance.project_name || 'Company',
      docNumberPrefix: 'DOC',
      defaultRevision: 'Rev 0',
      projectSubtitle: '',
      documentNumber: 'DOC-',
    };
  }

  try {
    logoBase64 = await logoService.getLogoBase64(data.instance.project_id);
  } catch (err) {
    console.warn('[ReportService] Failed to fetch logo, proceeding without:', err.message);
    logoBase64 = null;
  }

  // Generate professional PDF
  return buildProfessionalPdf(data, config, logoBase64);
};

const generateITPReport = async (instanceId) => {
  const buffer = await generateITPReportBuffer(instanceId);
  const reportsDir = path.join('/tmp', 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const pdfPath = path.join(reportsDir, `ITP_${instanceId}_${Date.now()}.pdf`);
  fs.writeFileSync(pdfPath, buffer);
  return pdfPath;
};

const sendReportEmail = async (pdfPath, instanceName) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: '"ITP Management System" <no-reply@itpapp.com>',
    to: 'stakeholder@example.com',
    subject: `Completed ITP: ${instanceName}`,
    text: `Please find attached the completed ITP report for ${instanceName}.`,
    attachments: [{ filename: path.basename(pdfPath), path: pdfPath }],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Report email sent successfully');
  } catch (err) {
    console.error('Failed to send report email', err);
  }
};

module.exports = {
  generateITPReport,
  generateITPReportBuffer,
  sendReportEmail,
};

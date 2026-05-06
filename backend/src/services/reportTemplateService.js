const db = require('../db');

// Validation constraints
const MAX_COMPANY_NAME_LENGTH = 255;
const MAX_DOC_NUMBER_PREFIX_LENGTH = 50;
const MAX_DEFAULT_REVISION_LENGTH = 20;
const MAX_PROJECT_SUBTITLE_LENGTH = 500;
const DOC_NUMBER_PREFIX_PATTERN = /^[a-zA-Z0-9-]+$/;

/**
 * Validates report configuration fields.
 * Throws an error with statusCode 400 if any field is invalid.
 * @param {object} config
 */
function validateConfig(config) {
  const { companyName, docNumberPrefix, defaultRevision, projectSubtitle } = config;

  if (companyName !== undefined && companyName !== null) {
    if (typeof companyName !== 'string' || companyName.length > MAX_COMPANY_NAME_LENGTH) {
      const err = new Error(`company_name must be a string of at most ${MAX_COMPANY_NAME_LENGTH} characters`);
      err.statusCode = 400;
      throw err;
    }
  }

  if (docNumberPrefix !== undefined && docNumberPrefix !== null) {
    if (typeof docNumberPrefix !== 'string' || docNumberPrefix.length > MAX_DOC_NUMBER_PREFIX_LENGTH) {
      const err = new Error(`doc_number_prefix must be a string of at most ${MAX_DOC_NUMBER_PREFIX_LENGTH} characters`);
      err.statusCode = 400;
      throw err;
    }
    if (docNumberPrefix.length > 0 && !DOC_NUMBER_PREFIX_PATTERN.test(docNumberPrefix)) {
      const err = new Error('doc_number_prefix must contain only alphanumeric characters and hyphens');
      err.statusCode = 400;
      throw err;
    }
  }

  if (defaultRevision !== undefined && defaultRevision !== null) {
    if (typeof defaultRevision !== 'string' || defaultRevision.length > MAX_DEFAULT_REVISION_LENGTH) {
      const err = new Error(`default_revision must be a string of at most ${MAX_DEFAULT_REVISION_LENGTH} characters`);
      err.statusCode = 400;
      throw err;
    }
  }

  if (projectSubtitle !== undefined && projectSubtitle !== null) {
    if (typeof projectSubtitle !== 'string' || projectSubtitle.length > MAX_PROJECT_SUBTITLE_LENGTH) {
      const err = new Error(`project_subtitle must be a string of at most ${MAX_PROJECT_SUBTITLE_LENGTH} characters`);
      err.statusCode = 400;
      throw err;
    }
  }
}

/**
 * Updates report template configuration for a project.
 * Validates input and stores company_name, doc_number_prefix, default_revision,
 * project_subtitle in the projects table.
 * @param {number} projectId
 * @param {object} config - { companyName?, docNumberPrefix?, defaultRevision?, projectSubtitle? }
 * @returns {Promise<object>} The stored config
 */
async function updateReportConfig(projectId, config) {
  validateConfig(config);

  const { companyName, docNumberPrefix, defaultRevision, projectSubtitle } = config;

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  if (companyName !== undefined) {
    setClauses.push(`company_name = $${paramIndex++}`);
    values.push(companyName);
  }
  if (docNumberPrefix !== undefined) {
    setClauses.push(`doc_number_prefix = $${paramIndex++}`);
    values.push(docNumberPrefix);
  }
  if (defaultRevision !== undefined) {
    setClauses.push(`default_revision = $${paramIndex++}`);
    values.push(defaultRevision);
  }
  if (projectSubtitle !== undefined) {
    setClauses.push(`project_subtitle = $${paramIndex++}`);
    values.push(projectSubtitle);
  }

  if (setClauses.length === 0) {
    // Nothing to update, just return current config
    return getResolvedConfig(projectId);
  }

  values.push(projectId);

  const result = await db.query(
    `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
     RETURNING company_name, doc_number_prefix, default_revision, project_subtitle`,
    values
  );

  if (result.rows.length === 0) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const row = result.rows[0];
  return {
    companyName: row.company_name,
    docNumberPrefix: row.doc_number_prefix,
    defaultRevision: row.default_revision,
    projectSubtitle: row.project_subtitle
  };
}

/**
 * Fetches the project record and resolves the effective report configuration,
 * applying defaults where values are not configured.
 * Defaults: project name as company name, "DOC" as prefix, "Rev 0" as revision, "" as subtitle.
 * @param {number} projectId
 * @returns {Promise<object>} { companyName, docNumberPrefix, defaultRevision, projectSubtitle, documentNumber }
 */
async function getResolvedConfig(projectId) {
  const result = await db.query(
    `SELECT name, company_name, doc_number_prefix, default_revision, project_subtitle
     FROM projects WHERE id = $1`,
    [projectId]
  );

  if (result.rows.length === 0) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const row = result.rows[0];

  const companyName = row.company_name || row.name;
  const docNumberPrefix = row.doc_number_prefix || 'DOC';
  const defaultRevision = row.default_revision || 'Rev 0';
  const projectSubtitle = row.project_subtitle || '';

  return {
    companyName,
    docNumberPrefix,
    defaultRevision,
    projectSubtitle,
    documentNumber: generateDocumentNumber(docNumberPrefix, '')
  };
}

/**
 * Generates the document number from prefix + template identifier.
 * @param {string} prefix - e.g., "8D91"
 * @param {string} templateName - e.g., "ITP-512"
 * @returns {string} e.g., "8D91-ITP-512"
 */
function generateDocumentNumber(prefix, templateName) {
  return `${prefix}-${templateName}`;
}

module.exports = {
  updateReportConfig,
  getResolvedConfig,
  generateDocumentNumber,
  validateConfig
};

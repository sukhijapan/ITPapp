const { Pool } = require('pg');

async function runSeeding() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: {
      rejectUnauthorized: false
    }
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create the Template
    const templateRes = await client.query(
      'INSERT INTO itp_templates (project_id, name, description) VALUES ($1, $2, $3) RETURNING id',
      [1, 'Diaphragm Wall (Professional)', 'Comprehensive 4-Stage ITP for D-Wall Panels']
    );
    const templateId = templateRes.rows[0].id;

    const points = [
      // Stage 1: Approvals and Preliminary Requirements
      { seq: 1, section: 'Stage 1: Approvals and Preliminary Requirements', desc: 'Approved D-Wall Design & Confirm drawings on site are IFC', type: 'HP', ri: 'ENG', crit: 'Correct drawings in use on site', ref: 'Latest Drawing Transmittal', meth: 'Document', freq: 'Once', rec: 'Transmittal Record' },
      { seq: 2, section: 'Stage 1: Approvals and Preliminary Requirements', desc: 'Concrete mix design confirmation', type: 'HP', ri: 'ENG', crit: 'Approved by designer', ref: 'GDA Design Report', meth: 'Document', freq: 'Once', rec: 'Mix Design Approval' },
      { seq: 3, section: 'Stage 1: Approvals and Preliminary Requirements', desc: 'ACRS reinforcement compliance certificates', type: 'RP', ri: 'ENG', crit: 'ACRS certified', ref: 'AS 4671', meth: 'Review', freq: 'Per Batch', rec: 'ACRS Certificates' },
      { seq: 4, section: 'Stage 1: Approvals and Preliminary Requirements', desc: 'Reinforcement schedules checked against drawings', type: 'RP', ri: 'ENG', crit: 'Matches IFC drawings', ref: 'IFC Drawings', meth: 'Review', freq: 'Per Panel', rec: 'Schedule Approval' },
      { seq: 5, section: 'Stage 1: Approvals and Preliminary Requirements', desc: 'Shop drawings approval', type: 'HP', ri: 'ENG', crit: 'Approved by Designer', ref: 'Method Statement', meth: 'Document', freq: 'Once', rec: 'Approved Shop Drawings' },
      { seq: 6, section: 'Stage 1: Approvals and Preliminary Requirements', desc: 'Working platform TWD approval', type: 'HP', ri: 'ENG', crit: 'Safe for heavy machinery', ref: 'TWD Report', meth: 'Document', freq: 'Once', rec: 'TWD Certificate' },

      // Stage 2: Pre-construction Activities
      { seq: 7, section: 'Stage 2: Pre-construction Activities', desc: 'Survey setout of guide walls', type: 'HP', ri: 'SUR', crit: 'Within +/- 10mm tolerance', ref: 'Survey Plan', meth: 'Survey', freq: 'Per Panel', rec: 'Survey Report' },
      { seq: 8, section: 'Stage 2: Pre-construction Activities', desc: 'Guide wall construction (Verticality & Alignment)', type: 'WP', ri: 'SUP', crit: 'As per method statement', ref: 'Method Statement', meth: 'Measure', freq: 'Per Panel', rec: 'ITP Record' },
      { seq: 9, section: 'Stage 2: Pre-construction Activities', desc: 'Slurry plant setup and testing', type: 'IP', ri: 'SUP', crit: 'Slurry properties within specs', ref: 'Method Statement', meth: 'Test', freq: 'Daily', rec: 'Slurry Log' },
      { seq: 10, section: 'Stage 2: Pre-construction Activities', desc: 'Pre-pour planning / Toolbox talk', type: 'IP', ri: 'SS', crit: 'All crew briefed', ref: 'Safety Plan', meth: 'Visual', freq: 'Daily', rec: 'Toolbox Record' },

      // Stage 3: Construction and Concrete Placement
      { seq: 11, section: 'Stage 3: Construction and Concrete Placement', desc: 'D-wall panel excavation and Trench Stabilization', type: 'HP', ri: 'SUP', crit: 'Stability maintained', ref: 'Design Report', meth: 'Monitor', freq: 'Continuous', rec: 'Excavation Log' },
      { seq: 12, section: 'Stage 3: Construction and Concrete Placement', desc: 'Trench cleanliness and Slurry replacement', type: 'HP', ri: 'ENG', crit: 'Sand content < 1%', ref: 'Specs', meth: 'Test', freq: 'Per Panel', rec: 'Slurry Test Result' },
      { seq: 13, section: 'Stage 3: Construction and Concrete Placement', desc: 'Cage Placement as per shop drawings', type: 'HP', ri: 'SUP', crit: 'Correct cover & levels', ref: 'Shop Drawings', meth: 'Visual', freq: 'Per Panel', rec: 'Photos' },
      { seq: 14, section: 'Stage 3: Construction and Concrete Placement', desc: 'Tremie pipe placement and seals', type: 'WP', ri: 'SUP', crit: 'Airtight seals', ref: 'Method Statement', meth: 'Visual', freq: 'Per Panel', rec: 'Visual Inspection' },
      { seq: 15, section: 'Stage 3: Construction and Concrete Placement', desc: 'Concrete delivery checks (Slump & Temp)', type: 'IP', ri: 'SUP', crit: 'Within mix design tolerances', ref: 'Mix Design', meth: 'Test', freq: 'Per Load', rec: 'Delivery Dockets' },
      { seq: 16, section: 'Stage 3: Construction and Concrete Placement', desc: 'Concrete placement and casting records', type: 'WP', ri: 'SS', crit: 'Continuous pour', ref: 'Specs', meth: 'Monitor', freq: 'Continuous', rec: 'Casting Log' },

      // Stage 4: Post-Pour
      { seq: 17, section: 'Stage 4: Post-Pour', desc: 'Post-pour concrete test results (7/28 Days)', type: 'RP', ri: 'ENG', crit: 'Meets characteristic strength', ref: 'AS 3600', meth: 'Review', freq: 'Per Batch', rec: 'Lab Reports' },
      { seq: 18, section: 'Stage 4: Post-Pour', desc: 'Basement excavation inspection (Exposed Wall)', type: 'IP', ri: 'ENG', crit: 'No major defects/leakage', ref: 'Specs', meth: 'Visual', freq: 'Post-Excavation', rec: 'Photos' },
      { seq: 19, section: 'Stage 4: Post-Pour', desc: 'As-built documentation and Survey', type: 'RP', ri: 'SUR', crit: 'Within design tolerances', ref: 'IFC Drawings', meth: 'Review', freq: 'Per Panel', rec: 'As-Built Plan' },
      { seq: 20, section: 'Stage 4: Post-Pour', desc: 'Final NCR check and Closure', type: 'HP', ri: 'ENG', crit: 'All NCRs verified & closed', ref: 'Audit Log', meth: 'Review', freq: 'Final', rec: 'NCR Log' }
    ];

    for (const p of points) {
      await client.query(
        'INSERT INTO itp_template_points (template_id, sequence, section, description, type, responsible_party, acceptance_criteria, reference_documents, inspection_method, frequency, verifying_records) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [templateId, p.seq, p.section, p.desc, p.type, p.ri, p.crit, p.ref, p.meth, p.freq, p.rec]
      );
    }

    await client.query('COMMIT');
    return { templateId, pointCount: points.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error('Seeding failed: ' + err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = runSeeding;

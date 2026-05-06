import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import {
  TEST_USERS,
  DEACTIVATED_USER,
  TEST_PROJECT,
  TEST_TEMPLATE,
  TEST_ITP_INSTANCES,
  TEST_NCRS,
} from '../test-data/constants';

/**
 * Template points to seed — one of each type (HP, WP, RP, SP, IP).
 * These are inserted into itp_template_points and copied to itp_points for each instance.
 */
const TEMPLATE_POINTS = [
  {
    sequence: 1,
    description: 'Hold Point - Concrete pour inspection',
    type: 'HP' as const,
    acceptance_criteria: 'Concrete mix design approved',
    reference_documents: 'AS 3600',
    inspection_method: 'Visual inspection',
    frequency: 'Each pour',
    responsible_party: 'Head Contractor',
    section: 'Structural',
    verifying_records: 'Pour docket',
    approver_role_id: 2,
  },
  {
    sequence: 2,
    description: 'Witness Point - Reinforcement placement',
    type: 'WP' as const,
    acceptance_criteria: 'Rebar spacing per drawings',
    reference_documents: 'AS 3600',
    inspection_method: 'Measurement',
    frequency: 'Each cage',
    responsible_party: 'Subcontractor',
    section: 'Structural',
    verifying_records: 'Inspection report',
    approver_role_id: 3,
  },
  {
    sequence: 3,
    description: 'Review Point - Material certificates',
    type: 'RP' as const,
    acceptance_criteria: 'Certificates match specification',
    reference_documents: 'Project spec',
    inspection_method: 'Document review',
    frequency: 'Per delivery',
    responsible_party: 'Head Contractor',
    section: 'Materials',
    verifying_records: 'Certificate file',
    approver_role_id: 2,
  },
  {
    sequence: 4,
    description: 'Surveillance Point - Formwork alignment',
    type: 'SP' as const,
    acceptance_criteria: 'Within tolerance ±5mm',
    reference_documents: 'Drawing set',
    inspection_method: 'Survey',
    frequency: 'Each setup',
    responsible_party: 'Subcontractor',
    section: 'Structural',
    verifying_records: 'Survey report',
    approver_role_id: 1,
  },
  {
    sequence: 5,
    description: 'Information Point - Safety briefing completed',
    type: 'IP' as const,
    acceptance_criteria: 'All workers briefed',
    reference_documents: 'WHS Plan',
    inspection_method: 'Attendance record',
    frequency: 'Daily',
    responsible_party: 'Subcontractor',
    section: 'Safety',
    verifying_records: 'Sign-on sheet',
    approver_role_id: null,
  },
];

export async function seedTestData(): Promise<void> {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'itpapp',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    // --- Upsert test users (one per role) ---
    for (const [, user] of Object.entries(TEST_USERS)) {
      const hash = await bcrypt.hash(user.password, 10);
      await pool.query(
        `INSERT INTO users (email, full_name, password_hash, role_id, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           role_id = EXCLUDED.role_id,
           is_active = true`,
        [user.email, user.fullName, hash, user.roleId]
      );
    }

    // --- Upsert deactivated user ---
    const deactivatedHash = await bcrypt.hash(DEACTIVATED_USER.password, 10);
    await pool.query(
      `INSERT INTO users (email, full_name, password_hash, role_id, is_active)
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         full_name = EXCLUDED.full_name,
         role_id = EXCLUDED.role_id,
         is_active = false`,
      [DEACTIVATED_USER.email, DEACTIVATED_USER.fullName, deactivatedHash, DEACTIVATED_USER.roleId]
    );

    // --- Upsert test project ---
    await pool.query(
      `INSERT INTO projects (id, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description`,
      [TEST_PROJECT.id, TEST_PROJECT.name, TEST_PROJECT.description]
    );

    // --- Upsert ITP template ---
    await pool.query(
      `INSERT INTO itp_templates (id, project_id, name, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         project_id = EXCLUDED.project_id,
         name = EXCLUDED.name,
         description = EXCLUDED.description`,
      [TEST_TEMPLATE.id, TEST_TEMPLATE.projectId, TEST_TEMPLATE.name, 'E2E test template']
    );

    // --- Seed template points (delete + re-insert for idempotency) ---
    await pool.query(
      `DELETE FROM itp_template_points WHERE template_id = $1`,
      [TEST_TEMPLATE.id]
    );
    for (const point of TEMPLATE_POINTS) {
      await pool.query(
        `INSERT INTO itp_template_points (template_id, sequence, description, type, acceptance_criteria, reference_documents, inspection_method, frequency, responsible_party, section, verifying_records, approver_role_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          TEST_TEMPLATE.id,
          point.sequence,
          point.description,
          point.type,
          point.acceptance_criteria,
          point.reference_documents,
          point.inspection_method,
          point.frequency,
          point.responsible_party,
          point.section,
          point.verifying_records,
          point.approver_role_id,
        ]
      );
    }

    // --- Get the created_by user ID (use subcontractor) ---
    const creatorResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [TEST_USERS.subcontractor.email]
    );
    const createdByUserId = creatorResult.rows[0].id;

    // --- Upsert ITP instances ---
    const instances = [
      { id: TEST_ITP_INSTANCES.draft.id, status: TEST_ITP_INSTANCES.draft.status, name: 'E2E Draft ITP' },
      { id: TEST_ITP_INSTANCES.pendingReview.id, status: TEST_ITP_INSTANCES.pendingReview.status, name: 'E2E Pending Review ITP' },
      { id: TEST_ITP_INSTANCES.open.id, status: TEST_ITP_INSTANCES.open.status, name: 'E2E Open ITP' },
      { id: TEST_ITP_INSTANCES.closed.id, status: TEST_ITP_INSTANCES.closed.status, name: 'E2E Closed ITP' },
    ];

    for (const instance of instances) {
      await pool.query(
        `INSERT INTO itp_instances (id, template_id, project_id, name, status, created_by)
         VALUES ($1, $2, $3, $4, $5::itp_status, $6)
         ON CONFLICT (id) DO UPDATE SET
           template_id = EXCLUDED.template_id,
           project_id = EXCLUDED.project_id,
           name = EXCLUDED.name,
           status = EXCLUDED.status,
           created_by = EXCLUDED.created_by`,
        [instance.id, TEST_TEMPLATE.id, TEST_PROJECT.id, instance.name, instance.status, createdByUserId]
      );
    }

    // --- Seed ITP points for each instance (delete + re-insert for idempotency) ---
    // First, delete NCRs that reference our test ITP points (FK constraint)
    const instanceIds = instances.map((i) => i.id);
    const existingPoints = await pool.query(
      `SELECT id FROM itp_points WHERE instance_id = ANY($1)`,
      [instanceIds]
    );
    const existingPointIds = existingPoints.rows.map((r: { id: number }) => r.id);

    if (existingPointIds.length > 0) {
      await pool.query(
        `DELETE FROM ncr_defects WHERE itp_point_id = ANY($1)`,
        [existingPointIds]
      );
      await pool.query(
        `DELETE FROM media WHERE itp_point_id = ANY($1)`,
        [existingPointIds]
      );
      await pool.query(
        `DELETE FROM itp_points WHERE instance_id = ANY($1)`,
        [instanceIds]
      );
    }

    // Re-insert ITP points for each instance
    for (const instance of instances) {
      for (const point of TEMPLATE_POINTS) {
        await pool.query(
          `INSERT INTO itp_points (instance_id, sequence, description, type, status, acceptance_criteria, reference_documents, inspection_method, frequency, responsible_party, section, verifying_records, approver_role_id)
           VALUES ($1, $2, $3, $4, $5::point_status, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            instance.id,
            point.sequence,
            point.description,
            point.type,
            'Open',
            point.acceptance_criteria,
            point.reference_documents,
            point.inspection_method,
            point.frequency,
            point.responsible_party,
            point.section,
            point.verifying_records,
            point.approver_role_id,
          ]
        );
      }
    }

    // --- Seed NCRs linked to ITP points ---
    // Get the first point of the Open ITP instance for the open NCR
    const openItpPointResult = await pool.query(
      `SELECT id FROM itp_points WHERE instance_id = $1 AND sequence = 1`,
      [TEST_ITP_INSTANCES.open.id]
    );
    const openItpPointId = openItpPointResult.rows[0]?.id;

    // Get the second point of the Open ITP instance for the closed NCR
    const closedNcrPointResult = await pool.query(
      `SELECT id FROM itp_points WHERE instance_id = $1 AND sequence = 2`,
      [TEST_ITP_INSTANCES.open.id]
    );
    const closedNcrPointId = closedNcrPointResult.rows[0]?.id;

    if (openItpPointId) {
      await pool.query(
        `INSERT INTO ncr_defects (id, itp_point_id, title, description, status, created_by)
         VALUES ($1, $2, $3, $4, $5::ncr_status, $6)
         ON CONFLICT (id) DO UPDATE SET
           itp_point_id = EXCLUDED.itp_point_id,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           created_by = EXCLUDED.created_by`,
        [
          TEST_NCRS.open.id,
          openItpPointId,
          'E2E Open NCR',
          'Non-conformance found during E2E testing — concrete cover insufficient',
          'Open',
          createdByUserId,
        ]
      );
    }

    if (closedNcrPointId) {
      await pool.query(
        `INSERT INTO ncr_defects (id, itp_point_id, title, description, status, created_by, root_cause, corrective_action, resolved_at)
         VALUES ($1, $2, $3, $4, $5::ncr_status, $6, $7, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           itp_point_id = EXCLUDED.itp_point_id,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           created_by = EXCLUDED.created_by,
           root_cause = EXCLUDED.root_cause,
           corrective_action = EXCLUDED.corrective_action,
           resolved_at = EXCLUDED.resolved_at`,
        [
          TEST_NCRS.closed.id,
          closedNcrPointId,
          'E2E Closed NCR',
          'Non-conformance found during E2E testing — rebar spacing out of tolerance',
          'Closed',
          createdByUserId,
          'Incorrect spacer placement',
          'Rebar repositioned and re-inspected',
        ]
      );
    }

    // --- Seed public library templates (for template library tests) ---
    await pool.query(`DELETE FROM itp_template_points WHERE template_id >= 200 AND template_id < 300`);
    await pool.query(`DELETE FROM itp_templates WHERE id >= 200 AND id < 300`);

    await pool.query(
      `INSERT INTO itp_templates (id, name, description, trade_category, is_public, version, created_by_org, clone_count)
       VALUES (200, 'Bulk Earthworks (Civil)', 'Comprehensive ITP for excavation, placement, and compaction.', 'Earthworks', true, '1.0', 'CivilStandard', 120),
              (201, 'Bridge Abutment Concrete', 'Detailed inspection for high-strength structural concrete.', 'Concrete', true, '1.1', 'CivilStandard', 85),
              (202, 'Structural Steel Erection', 'ITP for assembly and erection of structural steel members.', 'Steel', true, '1.0', 'CivilStandard', 45)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         trade_category = EXCLUDED.trade_category,
         is_public = EXCLUDED.is_public`
    );

    // Seed a few points for each library template
    const libraryPoints = [
      { templateId: 200, seq: 1, desc: 'Survey set-out and ground levels', type: 'HP' },
      { templateId: 200, seq: 2, desc: 'Proof rolling of subgrade', type: 'HP' },
      { templateId: 201, seq: 1, desc: 'Reinforcement placement and spacing', type: 'HP' },
      { templateId: 201, seq: 2, desc: 'Formwork stability and cleanliness', type: 'WP' },
      { templateId: 202, seq: 1, desc: 'Material traceability / Mill certificates', type: 'RP' },
      { templateId: 202, seq: 2, desc: 'Bolt tensioning', type: 'HP' },
    ];

    for (const lp of libraryPoints) {
      await pool.query(
        `INSERT INTO itp_template_points (template_id, sequence, description, type)
         VALUES ($1, $2, $3, $4)`,
        [lp.templateId, lp.seq, lp.desc, lp.type]
      );
    }

    console.log('✓ E2E test data seeded successfully');
  } finally {
    await pool.end();
  }
}

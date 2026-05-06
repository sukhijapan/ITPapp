const { Pool } = require('pg');

async function runMigration() {
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

  console.log('Starting RDS Migration Logic...');
  const results = [];
  
  const queries = [
    `ALTER TYPE point_type ADD VALUE IF NOT EXISTS 'IP';`,
    `ALTER TABLE itp_template_points ADD COLUMN IF NOT EXISTS section VARCHAR(255);`,
    `ALTER TABLE itp_points ADD COLUMN IF NOT EXISTS section VARCHAR(255);`,
    `ALTER TABLE itp_template_points ADD COLUMN IF NOT EXISTS verifying_records TEXT;`,
    `ALTER TABLE itp_points ADD COLUMN IF NOT EXISTS verifying_records TEXT;`,
    `ALTER TABLE itp_instances ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100);`,
    `ALTER TABLE itp_instances ADD COLUMN IF NOT EXISTS revision VARCHAR(10);`,
    `ALTER TABLE itp_instances ADD COLUMN IF NOT EXISTS drawing_ref TEXT;`,
    `ALTER TABLE itp_instances ADD COLUMN IF NOT EXISTS panel_no VARCHAR(100);`,
    `ALTER TABLE itp_instances ADD COLUMN IF NOT EXISTS closure_notes TEXT;`,
    `ALTER TABLE itp_template_points ADD COLUMN IF NOT EXISTS approver_role_id INTEGER REFERENCES roles(id);`,
    `ALTER TABLE itp_points ADD COLUMN IF NOT EXISTS approver_role_id INTEGER REFERENCES roles(id);`,
    // NCR detail fields (Hully Bolivar NCR template)
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS title VARCHAR(255);`,
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS category VARCHAR(100);`,
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS reported_to TEXT;`,
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS client_contact TEXT;`,
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS contractor_contact TEXT;`,
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS root_cause TEXT;`,
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS proposed_disposition TEXT;`,
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS proposed_completion_date TEXT;`,
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS corrective_action TEXT;`,
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS rectification_complete TEXT;`,
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS verified_by_contractor TEXT;`,
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS verified_by_client TEXT;`,
    `ALTER TABLE ncr_defects ADD COLUMN IF NOT EXISTS closing_remarks TEXT;`,
    // Backfill title from description for existing NCRs that don't have a title
    `UPDATE ncr_defects SET title = description WHERE title IS NULL;`,
    // User Onboarding — invitations and password resets
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`,
    `CREATE TABLE IF NOT EXISTS invitations (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      role_id INTEGER NOT NULL REFERENCES roles(id),
      token VARCHAR(64) UNIQUE NOT NULL,
      invited_by INTEGER NOT NULL REFERENCES users(id),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);`,
    `CREATE INDEX IF NOT EXISTS idx_invitations_email_status ON invitations(email, status);`,
    `CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token VARCHAR(64) UNIQUE NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);`,
    // Rename username to full_name (idempotent — only if username column still exists)
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username') THEN ALTER TABLE users RENAME COLUMN username TO full_name; END IF; END $$;`,
    `ALTER TABLE invitations ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);`,
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;`,
    // Widen file_type column to accommodate long MIME types (e.g. Office documents)
    `ALTER TABLE media ALTER COLUMN file_type TYPE VARCHAR(255);`,
    // Template Library Support
    `ALTER TABLE itp_templates ADD COLUMN IF NOT EXISTS trade_category VARCHAR(100);`,
    `ALTER TABLE itp_templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;`,
    `ALTER TABLE itp_templates ADD COLUMN IF NOT EXISTS version VARCHAR(20);`,
    `ALTER TABLE itp_templates ADD COLUMN IF NOT EXISTS created_by_org VARCHAR(255);`,
    `ALTER TABLE itp_templates ADD COLUMN IF NOT EXISTS clone_count INTEGER DEFAULT 0;`,
    // Media GPS coordinates (004_media_gps_coords)
    `ALTER TABLE media ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6);`,
    `ALTER TABLE media ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6);`,
    // External sign-off (003_external_sign_off)
    `CREATE TABLE IF NOT EXISTS external_sign_off_tokens (
      id SERIAL PRIMARY KEY,
      itp_point_id INTEGER REFERENCES itp_points(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      email VARCHAR(255) NOT NULL,
      role_name VARCHAR(50) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `ALTER TABLE itp_points ADD COLUMN IF NOT EXISTS is_external_sign_off BOOLEAN DEFAULT false;`,
    `ALTER TABLE itp_points ADD COLUMN IF NOT EXISTS external_signer_email VARCHAR(255);`,
    // Witness Point Notification tables (005_witness_point_notifications)
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wp_notification_status') THEN CREATE TYPE wp_notification_status AS ENUM ('Pending', 'Confirmed', 'Declined', 'Expired', 'Cancelled'); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wp_waiver_reason') THEN CREATE TYPE wp_waiver_reason AS ENUM ('timer_expired', 'recipient_declined'); END IF; END $$;`,
    `CREATE TABLE IF NOT EXISTS wp_notifications (
      id SERIAL PRIMARY KEY,
      itp_point_id INTEGER NOT NULL REFERENCES itp_points(id) ON DELETE CASCADE,
      itp_instance_id INTEGER NOT NULL REFERENCES itp_instances(id) ON DELETE CASCADE,
      created_by INTEGER NOT NULL REFERENCES users(id),
      status wp_notification_status NOT NULL DEFAULT 'Pending',
      planned_inspection_time TIMESTAMP WITH TIME ZONE NOT NULL,
      notice_period_hours INTEGER NOT NULL DEFAULT 24,
      expiry_time TIMESTAMP WITH TIME ZONE NOT NULL,
      location_description TEXT,
      scope_of_work TEXT,
      scheduler_arn TEXT,
      responded_by INTEGER REFERENCES users(id),
      responded_at TIMESTAMP WITH TIME ZONE,
      response_reason TEXT,
      requested_reschedule_time TIMESTAMP WITH TIME ZONE,
      cancelled_by INTEGER REFERENCES users(id),
      cancelled_at TIMESTAMP WITH TIME ZONE,
      cancellation_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_wp_notifications_pending_point ON wp_notifications (itp_point_id) WHERE status = 'Pending';`,
    `CREATE TABLE IF NOT EXISTS wp_notification_recipients (
      id SERIAL PRIMARY KEY,
      notification_id INTEGER NOT NULL REFERENCES wp_notifications(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      email VARCHAR(255) NOT NULL,
      recipient_name VARCHAR(255),
      is_external BOOLEAN NOT NULL DEFAULT false,
      notified_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS wp_response_tokens (
      id SERIAL PRIMARY KEY,
      notification_id INTEGER NOT NULL REFERENCES wp_notifications(id) ON DELETE CASCADE,
      recipient_id INTEGER NOT NULL REFERENCES wp_notification_recipients(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS wp_auto_waivers (
      id SERIAL PRIMARY KEY,
      notification_id INTEGER NOT NULL REFERENCES wp_notifications(id) ON DELETE CASCADE,
      itp_point_id INTEGER NOT NULL REFERENCES itp_points(id),
      trigger_reason wp_waiver_reason NOT NULL,
      triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      time_elapsed_hours NUMERIC(6,2),
      metadata JSONB
    );`,
    `CREATE TABLE IF NOT EXISTS project_wp_config (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
      notice_period_hours INTEGER NOT NULL DEFAULT 24 CHECK (notice_period_hours >= 1 AND notice_period_hours <= 168),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS project_wp_default_recipients (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      email VARCHAR(255) NOT NULL,
      recipient_name VARCHAR(255),
      is_external BOOLEAN NOT NULL DEFAULT false,
      role_filter INTEGER REFERENCES roles(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `ALTER TABLE itp_points ADD COLUMN IF NOT EXISTS wp_waiver_status JSONB;`,
  ];

  try {
    for (const query of queries) {
      await pool.query(query);
      results.push({ query: query.substring(0, 30), status: 'OK' });
    }
    return results;
  } catch (err) {
    throw new Error('Migration failed: ' + err.message);
  } finally {
    await pool.end();
  }
}

module.exports = runMigration;

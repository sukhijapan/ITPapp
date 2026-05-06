-- Migration for Global Library
ALTER TABLE itp_templates ADD COLUMN trade_category VARCHAR(100);
ALTER TABLE itp_templates ADD COLUMN is_public BOOLEAN DEFAULT false;
ALTER TABLE itp_templates ADD COLUMN version VARCHAR(20) DEFAULT '1.0';
ALTER TABLE itp_templates ADD COLUMN created_by_org VARCHAR(255);
ALTER TABLE itp_templates ADD COLUMN clone_count INTEGER DEFAULT 0;

-- Update existing description column to be TEXT if it wasn't already (it is in schema.sql but just in case)
-- Actually itp_templates.description is already TEXT in schema.sql.

-- Optional: Seed some initial library templates
-- This would require inserting into itp_templates and itp_template_points

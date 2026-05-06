-- Migration: 007_professional_reports.sql
-- Description: Adds report branding and template configuration columns to the
--   projects table for professional PDF report generation.

-- Report template configuration
ALTER TABLE projects ADD COLUMN company_name VARCHAR(255);
ALTER TABLE projects ADD COLUMN doc_number_prefix VARCHAR(50);
ALTER TABLE projects ADD COLUMN default_revision VARCHAR(20) DEFAULT 'Rev 0';
ALTER TABLE projects ADD COLUMN project_subtitle VARCHAR(500);

-- Logo storage
ALTER TABLE projects ADD COLUMN logo_s3_key TEXT;
ALTER TABLE projects ADD COLUMN logo_mime_type VARCHAR(50);
ALTER TABLE projects ADD COLUMN logo_base64 TEXT;
ALTER TABLE projects ADD COLUMN logo_uploaded_at TIMESTAMP WITH TIME ZONE;

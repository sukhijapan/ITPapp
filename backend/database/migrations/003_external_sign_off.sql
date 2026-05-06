-- Migration: 003_external_sign_off.sql
-- Description: Adds table for secure, link-based external sign-offs

CREATE TABLE external_sign_off_tokens (
    id SERIAL PRIMARY KEY,
    itp_point_id INTEGER REFERENCES itp_points(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    role_name VARCHAR(50) NOT NULL, -- The role they are signing off as (e.g., 'Client', 'Superintendent')
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add a column to track if a point was signed off externally
ALTER TABLE itp_points ADD COLUMN is_external_sign_off BOOLEAN DEFAULT false;
ALTER TABLE itp_points ADD COLUMN external_signer_email VARCHAR(255);

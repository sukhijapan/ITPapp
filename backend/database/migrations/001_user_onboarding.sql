-- Migration: User Onboarding
-- Add is_active to users, create invitations and password_resets tables

-- Add is_active to users
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Invitations table
CREATE TABLE invitations (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    token VARCHAR(64) UNIQUE NOT NULL,
    invited_by INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email_status ON invitations(email, status);

-- Password resets table
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token VARCHAR(64) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_password_resets_token ON password_resets(token);

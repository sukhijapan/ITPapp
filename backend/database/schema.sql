-- Initial Schema for ITP Management System

-- Roles Table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (name) VALUES ('Subcontractor'), ('Head Contractor'), ('Client'), ('Admin');

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ITP Templates
CREATE TABLE itp_templates (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ITP Template Points
CREATE TYPE point_type AS ENUM ('HP', 'WP', 'RP', 'SP');

CREATE TABLE itp_template_points (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES itp_templates(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    description TEXT NOT NULL,
    type point_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ITP Instances
CREATE TYPE itp_status AS ENUM ('Draft', 'Open', 'Pending Review', 'Approved', 'Rejected', 'Closed', 'Overdue');

CREATE TABLE itp_instances (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES itp_templates(id),
    project_id INTEGER REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    status itp_status DEFAULT 'Draft',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ITP Instance Points (Points within a specific ITP execution)
CREATE TYPE point_status AS ENUM ('Open', 'Pending', 'Approved', 'Rejected', 'Closed');

CREATE TABLE itp_points (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES itp_instances(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    description TEXT NOT NULL,
    type point_type NOT NULL,
    status point_status DEFAULT 'Open',
    signed_off_by INTEGER REFERENCES users(id),
    signed_off_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Non-Conformance Reports (NCR) / Defects
CREATE TYPE ncr_status AS ENUM ('Open', 'Resolved', 'Verified', 'Closed');

CREATE TABLE ncr_defects (
    id SERIAL PRIMARY KEY,
    itp_point_id INTEGER REFERENCES itp_points(id),
    description TEXT NOT NULL,
    status ncr_status DEFAULT 'Open',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Media / Attachments
CREATE TABLE media (
    id SERIAL PRIMARY KEY,
    itp_point_id INTEGER REFERENCES itp_points(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50),
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    itp_instance_id INTEGER REFERENCES itp_instances(id),
    itp_point_id INTEGER REFERENCES itp_points(id),
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    old_status TEXT,
    new_status TEXT,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

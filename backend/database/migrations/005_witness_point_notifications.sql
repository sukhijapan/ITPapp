-- Migration: 005_witness_point_notifications.sql
-- Description: Adds tables for witness point notification workflow including
--   notifications, recipients, response tokens, auto-waivers, and project config.

-- ENUM types
CREATE TYPE wp_notification_status AS ENUM ('Pending', 'Confirmed', 'Declined', 'Expired', 'Cancelled');
CREATE TYPE wp_waiver_reason AS ENUM ('timer_expired', 'recipient_declined');

-- Witness Point Notifications
CREATE TABLE wp_notifications (
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
);

-- Only one pending notification per ITP point at a time
CREATE UNIQUE INDEX idx_wp_notifications_pending_point
    ON wp_notifications (itp_point_id)
    WHERE status = 'Pending';

-- Notification Recipients
CREATE TABLE wp_notification_recipients (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES wp_notifications(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    is_external BOOLEAN NOT NULL DEFAULT false,
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Response Tokens (single-use, time-bounded)
CREATE TABLE wp_response_tokens (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES wp_notifications(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES wp_notification_recipients(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Auto-Waiver Records
CREATE TABLE wp_auto_waivers (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES wp_notifications(id) ON DELETE CASCADE,
    itp_point_id INTEGER NOT NULL REFERENCES itp_points(id),
    trigger_reason wp_waiver_reason NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_elapsed_hours NUMERIC(6,2),
    metadata JSONB
);

-- Project-level Witness Point Configuration
CREATE TABLE project_wp_config (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
    notice_period_hours INTEGER NOT NULL DEFAULT 24 CHECK (notice_period_hours >= 1 AND notice_period_hours <= 168),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project-level Default Recipients
CREATE TABLE project_wp_default_recipients (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    is_external BOOLEAN NOT NULL DEFAULT false,
    role_filter INTEGER REFERENCES roles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add waiver status metadata to ITP points
ALTER TABLE itp_points ADD COLUMN wp_waiver_status JSONB;

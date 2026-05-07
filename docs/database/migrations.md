# Migration History

<!-- 
  Last Updated: 2025-01-01
  Covers: v1.0 of the application
  Maintainer: Development Team
-->

## Overview

The database schema evolves through numbered SQL migration files located at `backend/database/migrations/`. Migrations are applied sequentially and are idempotent where possible.

The base schema is defined in `backend/database/schema.sql` and includes the core tables (roles, users, projects, itp_templates, itp_template_points, itp_instances, itp_points, ncr_defects, media, audit_logs).

---

## Migration 001: User Onboarding

**File:** `001_user_onboarding.sql`

**Description:** Adds user lifecycle management and invitation-based registration support.

**Changes:**
- Adds `is_active` column (BOOLEAN, DEFAULT true) to `users` table for account activation/deactivation
- Creates `invitations` table for secure, token-based user registration
- Creates `password_resets` table for forgot-password flow
- Adds indexes on token columns for fast lookup

**New Tables:**
- `invitations` — stores pending invitations with token, role, and expiry
- `password_resets` — stores reset tokens with expiry and usage tracking

**New Indexes:**
- `idx_invitations_token` on `invitations(token)`
- `idx_invitations_email_status` on `invitations(email, status)`
- `idx_password_resets_token` on `password_resets(token)`

---

## Migration 002: Global Library

**File:** `002_global_library.sql`

**Description:** Extends ITP templates to support a shared global library with categorization and versioning.

**Changes:**
- Adds `trade_category` column (VARCHAR(100)) to `itp_templates` — discipline classification
- Adds `is_public` column (BOOLEAN, DEFAULT false) to `itp_templates` — library visibility flag
- Adds `version` column (VARCHAR(20), DEFAULT '1.0') to `itp_templates` — template versioning
- Adds `created_by_org` column (VARCHAR(255)) to `itp_templates` — originating organization
- Adds `clone_count` column (INTEGER, DEFAULT 0) to `itp_templates` — usage tracking

---

## Migration 003: External Sign-Off

**File:** `003_external_sign_off.sql`

**Description:** Adds secure, link-based external sign-off capability for parties without application accounts.

**Changes:**
- Creates `external_sign_off_tokens` table for token-based external approvals
- Adds `is_external_sign_off` column (BOOLEAN, DEFAULT false) to `itp_points`
- Adds `external_signer_email` column (VARCHAR(255)) to `itp_points`

**New Tables:**
- `external_sign_off_tokens` — stores tokens with email, role, expiry (48h), and usage tracking

---

## Migration 004: Media GPS Coordinates

**File:** `004_media_gps_coords.sql`

**Description:** Adds geolocation support to media attachments for evidence-based documentation.

**Changes:**
- Adds `latitude` column (DECIMAL(9,6)) to `media` table
- Adds `longitude` column (DECIMAL(9,6)) to `media` table

**Notes:**
- DECIMAL(9,6) supports coordinates from -999.999999 to 999.999999, providing sub-meter precision
- Coordinates are optional — existing media records remain valid with NULL values

---

## Migration 005: Witness Point Notifications

**File:** `005_witness_point_notifications.sql`

**Description:** Adds the complete witness point notification workflow including notifications, recipients, response tokens, auto-waivers, and project-level configuration.

**Changes:**
- Creates `wp_notification_status` enum type (Pending, Confirmed, Declined, Expired, Cancelled)
- Creates `wp_waiver_reason` enum type (timer_expired, recipient_declined)
- Creates 6 new tables for the witness point workflow
- Adds `wp_waiver_status` column (JSONB) to `itp_points`
- Creates unique partial index ensuring one pending notification per point

**New Tables:**
- `wp_notifications` — core notification records with scheduling and response tracking
- `wp_notification_recipients` — recipients (internal users or external emails) per notification
- `wp_response_tokens` — single-use tokens for email-based responses
- `wp_auto_waivers` — records of automatic waivers with trigger reason and timing
- `project_wp_config` — project-level notice period configuration (1–168 hours)
- `project_wp_default_recipients` — default recipients auto-added to notifications

**New Indexes:**
- `idx_wp_notifications_pending_point` — unique partial index on `itp_point_id` WHERE `status = 'Pending'`

---

## Migration 006: Performance Indexes

**File:** `006_performance_indexes.sql`

**Description:** Adds B-tree indexes on frequently queried foreign key columns that appear in WHERE clauses of hot-path queries.

**Changes:**
- Creates `idx_itp_points_instance_id` on `itp_points(instance_id)`
- Creates `idx_ncr_defects_itp_point_id` on `ncr_defects(itp_point_id)`
- Creates `idx_audit_logs_itp_point_id` on `audit_logs(itp_point_id)`
- Creates `idx_media_itp_point_id` on `media(itp_point_id)`
- Creates `idx_wp_notifications_itp_point_id` on `wp_notifications(itp_point_id)`
- Creates `idx_wp_notifications_status` on `wp_notifications(status)`

**Notes:**
- All indexes use `CREATE INDEX IF NOT EXISTS` for idempotent application
- These indexes improve query performance for point-level data retrieval across all domains

---

## Migration 007: Professional Reports

**File:** `007_professional_reports.sql`

**Description:** Adds report branding and template configuration to projects for professional PDF report generation.

**Changes:**
- Adds `company_name` column (VARCHAR(255)) to `projects` — company name on reports
- Adds `doc_number_prefix` column (VARCHAR(50)) to `projects` — document numbering prefix
- Adds `default_revision` column (VARCHAR(20), DEFAULT 'Rev 0') to `projects` — default revision label
- Adds `project_subtitle` column (VARCHAR(500)) to `projects` — report cover page subtitle
- Adds `logo_s3_key` column (TEXT) to `projects` — S3 key for uploaded logo
- Adds `logo_mime_type` column (VARCHAR(50)) to `projects` — logo MIME type
- Adds `logo_base64` column (TEXT) to `projects` — base64-encoded logo for PDF embedding
- Adds `logo_uploaded_at` column (TIMESTAMPTZ) to `projects` — logo upload timestamp

---

[← Back to Database Schema](./README.md) | [← Back to Documentation Index](../README.md)
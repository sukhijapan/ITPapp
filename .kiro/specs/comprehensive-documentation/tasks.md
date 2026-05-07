# Tasks

## Task 1: Documentation Foundation and Root README

- [x] 1.1 Create the `docs/` folder structure with all subdirectories (api/, database/, adr/, user-guide/, workflows/, release-notes/)
- [x] 1.2 Create `docs/README.md` as the documentation table of contents with links to all sections, organized by technical vs non-technical
- [x] 1.3 Create the root `README.md` with project overview, technology stack table, prerequisites, quick start instructions, project structure tree, available scripts, and link to docs/

## Task 2: API Documentation

- [x] 2.1 Create `docs/api/README.md` with API overview, base URL, authentication mechanism (JWT Bearer token), rate limiting info (10 req/min auth, 200 req/min general), and links to all endpoint files
- [x] 2.2 Create `docs/api/authentication.md` documenting all auth endpoints: register, login, register-invite, forgot-password, reset-password validate, reset-password execute
- [x] 2.3 Create `docs/api/projects.md` documenting project endpoints: create, list, get by ID, get stats, update report-config, get report-config
- [x] 2.4 Create `docs/api/templates.md` documenting template endpoints: create, list, get library, clone, publish, get by ID, delete
- [x] 2.5 Create `docs/api/itps.md` documenting ITP instance endpoints: create, list, get by ID, submit, approve, reject, deactivate, delete, point sign-off, get report
- [x] 2.6 Create `docs/api/ncrs.md` documenting NCR endpoints: list, get by ID, get by point, create, update, resolve
- [x] 2.7 Create `docs/api/media.md` documenting media endpoints: upload, upload-url (presigned), delete, get by instance, get by point
- [x] 2.8 Create `docs/api/invitations.md` documenting invitation endpoints: create, validate token, list pending, resend, delete
- [x] 2.9 Create `docs/api/external-sign-off.md` documenting external sign-off endpoints: validate token, execute sign-off, request sign-off
- [x] 2.10 Create `docs/api/users.md` documenting user management endpoints: list users, update user, deactivate, activate, get roles
- [x] 2.11 Create `docs/api/witness-points.md` documenting all WP notification endpoints: create, get by ID, get by point, cancel, respond, remaining-time, audit, token validate, token respond, auto-waive, and project WP config endpoints
- [x] 2.12 Create `docs/api/logos.md` documenting logo endpoints: upload logo, get logo, delete logo

## Task 3: Database Schema Documentation

- [x] 3.1 Create `docs/database/README.md` with overview of all tables organized by domain, all custom enum types (point_type, itp_status, point_status, ncr_status, wp_notification_status, wp_waiver_reason), and key indexes/constraints
- [x] 3.2 Document core tables (roles, users, projects, audit_logs) with columns, types, constraints, and descriptions
- [x] 3.3 Document ITP tables (itp_templates, itp_template_points, itp_instances, itp_points) with all columns and relationships
- [x] 3.4 Document NCR table (ncr_defects) with all columns and the relationship to itp_points
- [x] 3.5 Document media table including GPS coordinate columns (latitude, longitude) added in migration 004
- [x] 3.6 Document external sign-off table (external_sign_off_tokens) with token expiry and usage tracking
- [x] 3.7 Document witness point tables (wp_notifications, wp_notification_recipients, wp_response_tokens, wp_auto_waivers, project_wp_config, project_wp_default_recipients)
- [x] 3.8 Document user onboarding tables (invitations, password_resets) with token hashing and expiry
- [x] 3.9 Create Mermaid ER diagram showing all table relationships and foreign keys
- [x] 3.10 Create `docs/database/migrations.md` documenting all 7 migrations with descriptions of what each adds

## Task 4: Architecture Decision Records

- [x] 4.1 Create `docs/adr/README.md` with ADR index and explanation of the ADR format
- [x] 4.2 Create `docs/adr/001-serverless-express.md` — Express on Lambda via serverless-http
- [x] 4.3 Create `docs/adr/002-s3-notification-pattern.md` — VPC Lambda writes JSON to S3, non-VPC Lambda sends email
- [x] 4.4 Create `docs/adr/003-eventbridge-auto-waivers.md` — EventBridge Scheduler for witness point auto-waivers
- [x] 4.5 Create `docs/adr/004-jwt-rbac.md` — JWT authentication with role-based access control
- [x] 4.6 Create `docs/adr/005-external-sign-off-tokens.md` — Token-based external approval pattern
- [x] 4.7 Create `docs/adr/006-pdf-generation-jspdf.md` — jsPDF with auto-table for professional reports
- [x] 4.8 Create `docs/adr/007-monorepo-structure.md` — Single repository for backend, frontend, infrastructure, e2e
- [x] 4.9 Create `docs/adr/008-cloudfront-s3-spa.md` — CloudFront + S3 for frontend hosting with SPA routing

## Task 5: Architecture Overview

- [x] 5.1 Create `docs/architecture.md` with system context diagram (Mermaid) showing frontend, backend Lambda, RDS, S3, SES, EventBridge, CloudFront
- [x] 5.2 Document the request flow from browser through CloudFront to Lambda Function URL to Express
- [x] 5.3 Document the notification flow: backend Lambda → S3 JSON → S3 event → notifier Lambda → SES
- [x] 5.4 Document the witness point timer flow: backend → EventBridge Schedule → wp-timer Lambda → backend API
- [x] 5.5 Document the media upload flow: frontend → backend (presigned URL) → frontend → S3 direct upload
- [x] 5.6 Document the deployment architecture with VPC layout, Lambda functions (backend VPC, notifier non-VPC, wp-timer handler non-VPC, wp-timer sweep non-VPC), security groups, and RDS

## Task 6: User Guide

- [x] 6.1 Create `docs/user-guide/README.md` with user guide index and audience description
- [x] 6.2 Create `docs/user-guide/getting-started.md` covering login, registration via invitation, and password reset
- [x] 6.3 Create `docs/user-guide/itp-management.md` covering creating ITPs from templates, Draft→Open→Closed workflow, point sign-off, HP blocking, auto-close
- [x] 6.4 Create `docs/user-guide/template-management.md` covering creating templates, adding points with types (HP/WP/RP/SP/IP), publishing to global library, cloning
- [x] 6.5 Create `docs/user-guide/ncr-management.md` covering raising NCRs, Open→Resolved→Verified→Closed lifecycle, NCR blocking point approval
- [x] 6.6 Create `docs/user-guide/media-management.md` covering uploading photos with GPS, viewing attachments, deletion protection after sign-off
- [x] 6.7 Create `docs/user-guide/witness-points.md` covering raising notifications, notice period, responding (confirm/decline), auto-waiver behavior
- [x] 6.8 Create `docs/user-guide/external-sign-off.md` covering requesting external approvals, 48-hour token expiry, completing sign-off via link
- [x] 6.9 Create `docs/user-guide/project-management.md` covering creating projects, dashboard stats, report branding configuration
- [x] 6.10 Create `docs/user-guide/pdf-reports.md` covering auto-generation on ITP closure, on-demand export, branding
- [x] 6.11 Create `docs/user-guide/user-administration.md` covering inviting users, role assignment, activation/deactivation
- [x] 6.12 Create `docs/user-guide/roles-permissions.md` with role-specific permission matrix for all 4 roles across all features

## Task 7: Feature Overview, Glossary, and Workflows

- [x] 7.1 Create `docs/features.md` documenting all 12 features with equal depth, organized by domain (Quality Execution, Quality Planning, Collaboration, Administration)
- [x] 7.2 Create `docs/glossary.md` with terms organized in three sections (Construction QA, Application Workflow, Technical Infrastructure), alphabetical within each
- [x] 7.3 Create `docs/workflows/README.md` with workflow diagrams index
- [x] 7.4 Create `docs/workflows/itp-lifecycle.md` with Mermaid stateDiagram showing Draft→Open→Pending Review→Approved/Rejected→Closed
- [x] 7.5 Create `docs/workflows/point-sign-off.md` with Mermaid diagram showing approval flow including HP blocking, NCR blocking, role-based approval
- [x] 7.6 Create `docs/workflows/ncr-lifecycle.md` with Mermaid stateDiagram showing Open→Resolved→Verified→Closed
- [x] 7.7 Create `docs/workflows/witness-point-flow.md` with Mermaid diagram showing creation, notice period, response options, auto-waiver timer
- [x] 7.8 Create `docs/workflows/external-sign-off.md` with Mermaid sequenceDiagram showing token generation, email, validation, execution
- [x] 7.9 Create `docs/workflows/user-onboarding.md` with Mermaid sequenceDiagram showing invitation, email, token validation, registration
- [x] 7.10 Create `docs/workflows/media-upload.md` with Mermaid sequenceDiagram showing presigned URL request, direct S3 upload, metadata storage

## Task 8: Release Notes and Final Review

- [x] 8.1 Create `docs/release-notes/README.md` as release notes index
- [x] 8.2 Create `docs/release-notes/TEMPLATE.md` with standardized sections: Version, Date, Summary, New Features, Improvements, Bug Fixes, Breaking Changes, Migration Steps, Known Issues
- [x] 8.3 Add navigation links (back to index) in all multi-page documentation sections (api/, user-guide/, workflows/, adr/, database/)
- [x] 8.4 Review all documents for consistent markdown formatting, correct internal links, and complete coverage of all 12 features

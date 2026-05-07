# Requirements Document

## Introduction

This document defines the requirements for comprehensive documentation of the Construction Quality Management application. The documentation suite serves both technical audiences (developers, DevOps engineers) and non-technical stakeholders (Project Managers, QA Managers, Construction Superintendents, Clients). All features are documented with equal depth based on their importance to the application's core purpose of managing construction quality through ITPs, NCRs, and inspection workflows.

## Glossary

- **Documentation_System**: The complete set of documentation artifacts produced for this application
- **Root_README**: The top-level README.md file providing quick start, architecture overview, and environment setup
- **API_Documentation**: Technical reference documenting all backend REST endpoints, request/response shapes, and authentication requirements
- **Schema_Documentation**: Database schema reference explaining tables, relationships, enums, and migrations
- **ADR**: Architecture Decision Record — a short document explaining why a specific technical approach was chosen
- **Architecture_Overview**: A system-level document describing how frontend, backend, database, and external services interact
- **User_Guide**: Non-technical documentation explaining how to use the application for each role
- **Feature_Overview**: A high-level summary of what the system does, organized by capability
- **Workflow_Diagram**: A visual representation (Mermaid syntax) of key business processes
- **Glossary_Document**: A reference mapping construction QA terminology to application concepts
- **Release_Notes_Template**: A standardized template for documenting changes in each version
- **ITP**: Inspection and Test Plan — the core quality document tracking inspection points
- **NCR**: Non-Conformance Report — a defect record linked to an ITP point
- **HP**: Hold Point — an inspection point that blocks progress until approved
- **WP**: Witness Point — an inspection point requiring notification to stakeholders
- **RBAC**: Role-Based Access Control — the permission system with 4 roles (Subcontractor, Head Contractor, Client, Admin)

## Requirements

### Requirement 1: Root README

**User Story:** As a developer joining the project, I want a comprehensive root README.md, so that I can quickly understand the project structure, set up my local environment, and start contributing.

#### Acceptance Criteria

1. THE Documentation_System SHALL include a root README.md file at the repository root
2. WHEN a developer reads the Root_README, THE Root_README SHALL provide a project overview describing the application as a construction quality management system
3. THE Root_README SHALL include a technology stack section listing Node.js/Express 5, React 19, TypeScript, PostgreSQL, AWS CDK, and AWS Lambda
4. THE Root_README SHALL include a prerequisites section listing required software versions (Node.js, PostgreSQL, AWS CLI)
5. THE Root_README SHALL include step-by-step local development setup instructions for backend, frontend, and infrastructure
6. THE Root_README SHALL include environment variable configuration with reference to .env.example
7. THE Root_README SHALL include a project structure overview showing the monorepo layout (backend/, frontend/, infrastructure/, e2e/, docs/)
8. THE Root_README SHALL include commands for running tests, linting, building, and deploying
9. THE Root_README SHALL include a link to the docs/ folder for detailed documentation

### Requirement 2: API Documentation

**User Story:** As a developer integrating with the backend, I want complete API documentation for all endpoints, so that I can understand request/response formats, authentication requirements, and error handling.

#### Acceptance Criteria

1. THE Documentation_System SHALL include an API reference document at docs/api/README.md
2. THE API_Documentation SHALL document all authentication endpoints: POST /api/auth/register, POST /api/auth/login, POST /api/auth/register-invite, POST /api/auth/forgot-password, GET /api/auth/reset-password/:token/validate, POST /api/auth/reset-password
3. THE API_Documentation SHALL document all project endpoints: POST /api/projects, GET /api/projects, GET /api/projects/:id, GET /api/projects/stats, PUT /api/projects/:id/report-config, GET /api/projects/:id/report-config
4. THE API_Documentation SHALL document all ITP template endpoints: POST /api/templates, GET /api/templates, GET /api/templates/library, POST /api/templates/:id/clone, POST /api/templates/:id/publish, GET /api/templates/:id, DELETE /api/templates/:id
5. THE API_Documentation SHALL document all ITP instance endpoints: POST /api/itps/instances, GET /api/itps/instances, GET /api/itps/instances/:id, POST /api/itps/instances/:id/submit, POST /api/itps/instances/:id/approve, POST /api/itps/instances/:id/reject, POST /api/itps/instances/:id/deactivate, DELETE /api/itps/instances/:id, POST /api/itps/points/:id/sign-off, GET /api/itps/instances/:id/report
6. THE API_Documentation SHALL document all NCR endpoints: GET /api/ncrs, GET /api/ncrs/:id, GET /api/ncrs/point/:itp_point_id, POST /api/ncrs, PUT /api/ncrs/:id, POST /api/ncrs/:id/resolve
7. THE API_Documentation SHALL document all media endpoints: POST /api/media/upload, POST /api/media/upload-url, DELETE /api/media/:id, GET /api/media/instance/:instance_id, GET /api/media/point/:itp_point_id
8. THE API_Documentation SHALL document all invitation endpoints: POST /api/invitations, GET /api/invitations/:token/validate, GET /api/invitations/pending, POST /api/invitations/:id/resend, DELETE /api/invitations/:id
9. THE API_Documentation SHALL document all external sign-off endpoints: GET /api/external-sign-off/validate/:token, POST /api/external-sign-off/execute, POST /api/external-sign-off/request
10. THE API_Documentation SHALL document all user management endpoints: GET /api/users, PATCH /api/users/:id, PATCH /api/users/:id/deactivate, PATCH /api/users/:id/activate, GET /api/roles
11. THE API_Documentation SHALL document all witness point notification endpoints: POST /api/wp-notifications, GET /api/wp-notifications/:id, GET /api/wp-notifications/point/:pointId, POST /api/wp-notifications/:id/cancel, POST /api/wp-notifications/:id/respond, GET /api/wp-notifications/:id/remaining-time, GET /api/wp-notifications/audit, GET /api/wp-notifications/token/:token/validate, POST /api/wp-notifications/token/:token/respond, POST /api/wp-notifications/:id/auto-waive
12. THE API_Documentation SHALL document all project witness point config endpoints: GET /api/projects/:id/wp-config, PUT /api/projects/:id/wp-config, POST /api/projects/:id/wp-config/recipients, DELETE /api/projects/:id/wp-config/recipients/:recipientId
13. THE API_Documentation SHALL document all logo endpoints: POST /api/projects/:id/logo, GET /api/projects/:id/logo, DELETE /api/projects/:id/logo
14. WHEN documenting each endpoint, THE API_Documentation SHALL specify the HTTP method, path, authentication requirement, role restrictions, request body schema, response schema, and possible error codes
15. THE API_Documentation SHALL include rate limiting information (10 req/min for auth endpoints, 200 req/min for general API)

### Requirement 3: Database Schema Documentation

**User Story:** As a developer working on data models, I want clear database schema documentation, so that I can understand table relationships, constraints, and the migration history.

#### Acceptance Criteria

1. THE Documentation_System SHALL include a database schema document at docs/database/README.md
2. THE Schema_Documentation SHALL describe all core tables: roles, users, projects, audit_logs
3. THE Schema_Documentation SHALL describe all ITP tables: itp_templates, itp_template_points, itp_instances, itp_points
4. THE Schema_Documentation SHALL describe all NCR tables: ncr_defects
5. THE Schema_Documentation SHALL describe all media tables: media (including GPS coordinate columns)
6. THE Schema_Documentation SHALL describe all external sign-off tables: external_sign_off_tokens
7. THE Schema_Documentation SHALL describe all witness point tables: wp_notifications, wp_notification_recipients, wp_response_tokens, wp_auto_waivers, project_wp_config, project_wp_default_recipients
8. THE Schema_Documentation SHALL describe all user onboarding tables: invitations, password_resets
9. THE Schema_Documentation SHALL document all custom enum types: point_type (HP, WP, RP, SP, IP), itp_status, point_status, ncr_status, wp_notification_status, wp_waiver_reason
10. THE Schema_Documentation SHALL include an entity relationship diagram using Mermaid syntax showing foreign key relationships between all tables
11. THE Schema_Documentation SHALL document the migration history (7 migrations) with descriptions of what each migration adds
12. THE Schema_Documentation SHALL document key indexes and constraints including the unique partial index on wp_notifications for pending points

### Requirement 4: Architecture Decision Records

**User Story:** As a developer or architect, I want ADRs documenting key technical decisions, so that I can understand the rationale behind the current architecture and avoid revisiting settled decisions.

#### Acceptance Criteria

1. THE Documentation_System SHALL include ADR documents in docs/adr/ following a numbered naming convention (001-title.md, 002-title.md)
2. WHEN creating an ADR, THE Documentation_System SHALL use a consistent format with sections: Title, Status, Context, Decision, Consequences
3. THE Documentation_System SHALL include an ADR for the serverless architecture choice (Express on Lambda via serverless-http)
4. THE Documentation_System SHALL include an ADR for the S3-based notification pattern (VPC Lambda writes JSON to S3, non-VPC Lambda sends email)
5. THE Documentation_System SHALL include an ADR for the EventBridge Scheduler approach to witness point auto-waivers
6. THE Documentation_System SHALL include an ADR for the JWT authentication with role-based access control approach
7. THE Documentation_System SHALL include an ADR for the external sign-off token-based approval pattern
8. THE Documentation_System SHALL include an ADR for the professional PDF generation approach (jsPDF with auto-table)
9. THE Documentation_System SHALL include an ADR for the monorepo structure (backend, frontend, infrastructure, e2e in one repository)
10. THE Documentation_System SHALL include an ADR for the CloudFront + S3 frontend hosting with SPA routing

### Requirement 5: Architecture Overview

**User Story:** As a developer or DevOps engineer, I want a system architecture overview, so that I can understand how all components interact and where each service fits in the deployment.

#### Acceptance Criteria

1. THE Documentation_System SHALL include an architecture overview document at docs/architecture.md
2. THE Architecture_Overview SHALL include a system context diagram showing the frontend (React SPA on CloudFront), backend (Lambda), database (RDS PostgreSQL), and external services (S3, SES, EventBridge)
3. THE Architecture_Overview SHALL describe the request flow from browser through CloudFront to Lambda Function URL to Express application
4. THE Architecture_Overview SHALL describe the notification flow: backend Lambda writes JSON to S3 notification bucket, S3 event triggers notifier Lambda, notifier sends email via SES
5. THE Architecture_Overview SHALL describe the witness point timer flow: backend creates EventBridge schedule, schedule invokes wp-timer Lambda at expiry, wp-timer calls backend API to process auto-waive
6. THE Architecture_Overview SHALL describe the media upload flow: frontend requests presigned URL from backend, frontend uploads directly to S3, backend stores metadata in database
7. THE Architecture_Overview SHALL include a deployment architecture diagram showing VPC layout (public subnets, security groups, RDS, Lambda)
8. THE Architecture_Overview SHALL document the four Lambda functions: backend (VPC), notifier (non-VPC), wp-timer handler (non-VPC), wp-timer sweep (non-VPC, runs every 5 minutes)
9. THE Architecture_Overview SHALL use Mermaid diagram syntax for all diagrams

### Requirement 6: User Guide

**User Story:** As a non-technical stakeholder (Project Manager, QA Manager, Superintendent), I want a user guide explaining how to use the application, so that I can perform my role-specific tasks without developer assistance.

#### Acceptance Criteria

1. THE Documentation_System SHALL include user guide documents in docs/user-guide/ organized by workflow
2. THE User_Guide SHALL include a getting started section covering login, registration via invitation, and password reset
3. THE User_Guide SHALL include an ITP management section covering: creating ITPs from templates, the Draft→Open→Closed workflow, point-level sign-off, HP blocking behavior, and auto-close on all points approved
4. THE User_Guide SHALL include a template management section covering: creating templates, adding points with types (HP, WP, RP, SP, IP), publishing to global library, cloning from library
5. THE User_Guide SHALL include an NCR management section covering: raising an NCR against a point, the Open→Resolved→Verified→Closed lifecycle, how NCRs block point approval
6. THE User_Guide SHALL include a media management section covering: uploading photos with GPS coordinates, viewing attachments, deletion protection after sign-off
7. THE User_Guide SHALL include a witness point notification section covering: raising notifications, notice period requirements, responding to notifications (confirm/decline), auto-waiver behavior
8. THE User_Guide SHALL include an external sign-off section covering: requesting external approvals, the 48-hour token expiry, how external parties complete sign-off via link
9. THE User_Guide SHALL include a project management section covering: creating projects, viewing dashboard stats, configuring report branding
10. THE User_Guide SHALL include a PDF reports section covering: auto-generation on ITP closure, on-demand export, report branding configuration
11. THE User_Guide SHALL include a user management section covering: inviting users, role assignment, activation/deactivation (Admin perspective)
12. THE User_Guide SHALL document role-specific permissions for each of the four roles: Subcontractor, Head Contractor, Client, Admin

### Requirement 7: Feature Overview

**User Story:** As any stakeholder, I want a high-level feature overview, so that I can quickly understand what the system does without reading detailed technical documentation.

#### Acceptance Criteria

1. THE Documentation_System SHALL include a feature overview document at docs/features.md
2. THE Feature_Overview SHALL describe all 12 features with equal depth: ITP Management, Template Management, NCR Management, Media Management, User Management, Invitations and Onboarding, Authentication and Authorization, External Sign-Offs, Witness Point Notifications, Professional PDF Reports, Project Management, Audit Trail
3. WHEN describing each feature, THE Feature_Overview SHALL include a brief description, key capabilities, and the roles that interact with the feature
4. THE Feature_Overview SHALL organize features by functional domain (Quality Execution, Quality Planning, Collaboration, Administration)

### Requirement 8: Workflow Diagrams

**User Story:** As a stakeholder, I want visual workflow diagrams, so that I can understand the sequence of steps in key business processes.

#### Acceptance Criteria

1. THE Documentation_System SHALL include workflow diagrams at docs/workflows/
2. THE Workflow_Diagram collection SHALL include an ITP lifecycle diagram showing Draft→Open→Pending Review→Approved/Rejected→Closed states and transitions
3. THE Workflow_Diagram collection SHALL include a point sign-off diagram showing the approval flow including HP blocking, NCR blocking, and role-based approval
4. THE Workflow_Diagram collection SHALL include an NCR lifecycle diagram showing Open→Resolved→Verified→Closed states
5. THE Workflow_Diagram collection SHALL include a witness point notification diagram showing creation, notice period, response options (confirm/decline), and auto-waiver timer flow
6. THE Workflow_Diagram collection SHALL include an external sign-off diagram showing token generation, email delivery, validation, and execution
7. THE Workflow_Diagram collection SHALL include a user onboarding diagram showing invitation creation, email delivery, token validation, and registration
8. THE Workflow_Diagram collection SHALL include a media upload diagram showing presigned URL request, direct S3 upload, and metadata storage
9. THE Workflow_Diagram collection SHALL use Mermaid syntax for all diagrams to enable rendering in GitHub and documentation tools

### Requirement 9: Glossary

**User Story:** As a new team member or non-technical stakeholder, I want a glossary mapping construction QA terminology to application concepts, so that I can understand domain-specific language used throughout the system.

#### Acceptance Criteria

1. THE Documentation_System SHALL include a glossary document at docs/glossary.md
2. THE Glossary_Document SHALL define all point types: Hold Point (HP), Witness Point (WP), Review Point (RP), Sample Point (SP), Inspection Point (IP)
3. THE Glossary_Document SHALL define ITP-related terms: Inspection and Test Plan, ITP Instance, ITP Template, Point Sequence, Lot Number, Drawing Reference
4. THE Glossary_Document SHALL define NCR-related terms: Non-Conformance Report, Root Cause, Corrective Action, Disposition, Verification
5. THE Glossary_Document SHALL define workflow terms: Draft, Open, Closed, Sign-Off, Auto-Close, Auto-Waiver, Notice Period
6. THE Glossary_Document SHALL define role terms: Subcontractor, Head Contractor, Client, Admin, and their responsibilities in the quality process
7. THE Glossary_Document SHALL define technical terms: Presigned URL, JWT, RBAC, EventBridge Schedule, Lambda Function URL
8. THE Glossary_Document SHALL organize terms alphabetically within categorized sections (Construction QA, Application Workflow, Technical Infrastructure)

### Requirement 10: Release Notes Template

**User Story:** As a project manager or developer, I want a standardized release notes template, so that each version's changes are documented consistently.

#### Acceptance Criteria

1. THE Documentation_System SHALL include a release notes template at docs/release-notes/TEMPLATE.md
2. THE Release_Notes_Template SHALL include sections for: Version Number, Release Date, Summary, New Features, Improvements, Bug Fixes, Breaking Changes, Migration Steps, Known Issues
3. THE Release_Notes_Template SHALL include guidance on how to categorize changes
4. THE Documentation_System SHALL include a release notes index at docs/release-notes/README.md linking to individual release documents
5. WHEN a new version is released, THE Release_Notes_Template SHALL provide a consistent structure that can be copied and filled in

### Requirement 11: Documentation Organization

**User Story:** As any reader, I want the documentation to be well-organized with clear navigation, so that I can find the information I need without searching through unrelated content.

#### Acceptance Criteria

1. THE Documentation_System SHALL organize all documentation under a docs/ folder at the repository root
2. THE Documentation_System SHALL include a docs/README.md serving as a table of contents with links to all documentation sections
3. THE Documentation_System SHALL separate technical documentation (API, database, architecture, ADRs) from non-technical documentation (user guide, feature overview, glossary)
4. THE Documentation_System SHALL use consistent markdown formatting across all documents
5. THE Documentation_System SHALL include navigation links (back to index, next/previous section) in multi-page documentation sections

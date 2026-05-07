<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
  Maintainer: Development Team
-->

# Feature Overview

This document provides a high-level summary of all 12 features in the Construction Quality Management application, organized by functional domain.

---

## Table of Contents

- [Quality Execution](#quality-execution)
  - [ITP Management](#itp-management)
  - [NCR Management](#ncr-management)
  - [Media Management](#media-management)
- [Quality Planning](#quality-planning)
  - [Template Management](#template-management)
  - [Professional PDF Reports](#professional-pdf-reports)
- [Collaboration](#collaboration)
  - [Witness Point Notifications](#witness-point-notifications)
  - [External Sign-Offs](#external-sign-offs)
- [Administration](#administration)
  - [User Management](#user-management)
  - [Invitations & Onboarding](#invitations--onboarding)
  - [Authentication & Authorization](#authentication--authorization)
  - [Project Management](#project-management)
  - [Audit Trail](#audit-trail)

---

## Quality Execution

### ITP Management

Inspection and Test Plans (ITPs) are the core quality documents that track inspection points through a construction project. Each ITP instance is created from a template and progresses through a defined lifecycle: Draft → Open → Pending Review → Approved/Rejected → Closed. Points within an ITP represent individual inspection activities that must be signed off by authorized roles before the plan can be completed.

**Key Capabilities:**

- Create ITP instances from published templates with pre-configured inspection points
- Progress ITPs through the full lifecycle with role-based state transitions
- Sign off individual points with role-based permission enforcement
- Hold Point (HP) blocking ensures points are completed in sequence
- Auto-close ITPs when all points reach approved status
- Submit for review, approve, or reject at the plan level
- Deactivate ITPs that are no longer needed

**Roles Involved:** Subcontractor (creates, signs off own points), Head Contractor (signs off, approves/rejects), Client (signs off, approves/rejects), Admin (full access)

---

### NCR Management

Non-Conformance Reports (NCRs) document defects or deviations discovered during inspections. Each NCR is linked to a specific ITP point and follows its own lifecycle. Open NCRs block the associated point from being signed off, ensuring defects are resolved before quality approval proceeds.

**Key Capabilities:**

- Raise NCRs against specific ITP points with detailed defect descriptions
- Track NCRs through Open → Resolved → Verified → Closed lifecycle
- Block point sign-off while NCRs remain open (enforced by the system)
- Record root cause analysis and corrective actions
- Verify resolution and close NCRs
- View all NCRs across a project or filtered by ITP point

**Roles Involved:** Subcontractor (raises NCRs, provides corrective actions), Head Contractor (verifies resolution), Client (verifies resolution), Admin (full access)

---

### Media Management

Media management handles photo and document attachments linked to ITP instances and individual inspection points. Files are uploaded directly to S3 using presigned URLs, supporting GPS coordinate capture for site photos. Deletion is protected after point sign-off to preserve the quality record.

**Key Capabilities:**

- Upload photos and documents with GPS coordinate metadata (latitude/longitude)
- Direct browser-to-S3 upload via presigned URLs (no file size limit from Lambda)
- Attach media to ITP instances or specific inspection points
- View all media for an instance or point
- Delete media (blocked after the associated point is signed off)
- 5-minute presigned URL expiry for security

**Roles Involved:** Subcontractor (uploads, views), Head Contractor (views, deletes), Client (views), Admin (full access)

---

## Quality Planning

### Template Management

Templates define the structure of ITPs before they are instantiated for a specific lot or work area. Each template contains a set of inspection points with defined types, sequences, and role requirements. Templates can be published to a global library for reuse across projects.

**Key Capabilities:**

- Create templates with ordered inspection points
- Define point types: Hold Point (HP), Witness Point (WP), Review Point (RP), Sample Point (SP), Inspection Point (IP)
- Set point sequences, descriptions, and required sign-off roles
- Publish templates to the global library for cross-project reuse
- Clone templates from the global library into a project
- Edit and delete draft templates

**Roles Involved:** Head Contractor (creates, publishes), Admin (full access, manages library)

---

### Professional PDF Reports

The system generates professional PDF reports for completed ITPs, suitable for submission to clients and regulatory bodies. Reports include project branding (logos), inspection point details, sign-off records, and NCR summaries. PDFs are generated using jsPDF with auto-table formatting.

**Key Capabilities:**

- Auto-generate PDF reports when an ITP is approved and closed
- On-demand PDF export for any ITP instance
- Project-level branding configuration (logo, company name)
- Include all point sign-off details with timestamps and signatories
- Include NCR summaries linked to each point
- Professional table formatting with consistent styling

**Roles Involved:** Head Contractor (generates, downloads), Client (downloads), Admin (configures branding, full access)

---

## Collaboration

### Witness Point Notifications

Witness Points (WPs) require that stakeholders are notified before an inspection occurs, giving them the opportunity to attend. The notification system manages notice periods, tracks responses, and automatically waives attendance if no response is received before the planned inspection time.

**Key Capabilities:**

- Raise witness point notifications with a defined notice period
- Configure project-level default recipients and notice period duration
- Send email notifications to all configured recipients
- Recipients respond with Confirm (will attend) or Decline (waive attendance)
- Auto-waiver timer fires at expiry if no response is received
- External recipients can respond via tokenized email links
- Cancel notifications if the inspection is rescheduled
- Full audit trail of all notification activity

**Roles Involved:** Subcontractor (raises notifications), Head Contractor (receives, responds), Client (receives, responds), Admin (configures recipients)

---

### External Sign-Offs

External sign-offs allow parties outside the system (e.g., third-party inspectors, regulatory bodies) to approve ITP points without needing a user account. A secure, time-limited token is generated and sent via email. The external party clicks the link, reviews the point details, and executes the sign-off.

**Key Capabilities:**

- Request external sign-off for any ITP point
- Generate secure tokens with 48-hour expiry
- Send branded email with sign-off link to external party
- Token validation ensures single-use and expiry enforcement
- External party can view point details and execute sign-off
- Sign-off is recorded with the external party's name and organization
- Full audit trail of token generation and usage

**Roles Involved:** Head Contractor (requests external sign-off), Client (requests external sign-off), Admin (full access), External Party (executes sign-off via link)

---

## Administration

### User Management

User management provides administrators with control over system users, including role assignment, activation, and deactivation. Users are assigned one of four roles that determine their permissions across all features.

**Key Capabilities:**

- View all users with their roles and status
- Update user details and role assignments
- Deactivate users (preserves data, removes access)
- Reactivate previously deactivated users
- View available roles and their descriptions

**Roles Involved:** Admin (full user management access)

---

### Invitations & Onboarding

The invitation system controls how new users join the application. Administrators create invitations with a pre-assigned role, and the invited user receives an email with a registration link. This ensures only authorized personnel can create accounts and that roles are assigned by administrators rather than self-selected.

**Key Capabilities:**

- Create invitations with email address and pre-assigned role
- Send invitation emails with secure registration links
- Token-based validation ensures invitations cannot be forged
- View pending invitations and their status
- Resend invitation emails if the original was missed
- Delete/revoke pending invitations
- Invited users register with their assigned role automatically applied

**Roles Involved:** Admin (creates and manages invitations)

---

### Authentication & Authorization

The authentication system uses JWT tokens for stateless session management and role-based access control (RBAC) to enforce permissions. Four roles provide graduated access levels appropriate to construction quality workflows.

**Key Capabilities:**

- JWT-based authentication with secure token generation
- Role-based access control with four roles: Subcontractor, Head Contractor, Client, Admin
- Login with email and password
- Registration via invitation link (no open registration)
- Password reset via email with secure token
- Rate limiting on authentication endpoints (10 req/min)
- Token validation and refresh

**Roles Involved:** All roles (authenticate), Admin (manages access)

---

### Project Management

Projects are the top-level organizational unit. All ITPs, NCRs, media, and users are scoped to a project. Project management includes creation, dashboard statistics, and report branding configuration.

**Key Capabilities:**

- Create projects with name and description
- View project dashboard with summary statistics (ITP counts by status, NCR counts, point completion rates)
- Configure report branding (upload project logo, set company details)
- View all projects accessible to the current user
- Project-scoped data isolation

**Roles Involved:** Head Contractor (creates projects, configures branding), Client (views dashboard), Admin (full access)

---

### Audit Trail

The audit trail provides a complete record of all significant actions performed in the system. Every state change, sign-off, approval, and configuration change is logged with the acting user, timestamp, and details of the change.

**Key Capabilities:**

- Automatic logging of all state transitions (ITP status changes, point sign-offs, NCR lifecycle events)
- Record acting user, timestamp, and action details
- Track witness point notification activity (sent, responded, waived)
- Track external sign-off token generation and usage
- Immutable audit records (cannot be edited or deleted)
- Query audit logs by entity, user, or time range

**Roles Involved:** Admin (views full audit trail), Head Contractor (views project-scoped audit), Client (views project-scoped audit)

---

[← Back to Documentation Index](./README.md)

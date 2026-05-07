<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
-->

# Roles & Permissions

This document provides a complete permission matrix showing what each role can do across all features in the system. Use this as a quick reference to understand access levels.

## The Four Roles

| Role | ID | Description |
|------|:---:|-------------|
| **Subcontractor** | 1 | Creates and executes ITPs, raises NCRs, uploads evidence. The primary "doer" role on site. |
| **Head Contractor** | 2 | Reviews and approves ITPs, manages projects, oversees quality processes. The primary management role. |
| **Client** | 3 | Views and approves ITPs, read-only access to most resources. The oversight/owner role. |
| **Admin** | 4 | Full system access including user management and configuration. The system administration role. |

## Permission Matrix

Legend: ✓ = Allowed · ✗ = Not allowed

### Authentication & Account

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Log in | ✓ | ✓ | ✓ | ✓ |
| Reset own password | ✓ | ✓ | ✓ | ✓ |
| Register via invitation | ✓ | ✓ | ✓ | ✓ |

### Project Management

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Create project | ✗ | ✓ | ✗ | ✓ |
| View projects | ✓ | ✓ | ✓ | ✓ |
| Edit project details | ✗ | ✓ | ✗ | ✓ |
| View dashboard statistics | ✓ | ✓ | ✓ | ✓ |
| Configure report branding | ✗ | ✓ | ✗ | ✓ |
| Upload/delete project logo | ✗ | ✓ | ✗ | ✓ |

### Template Management

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Create template | ✓ | ✓ | ✗ | ✓ |
| Edit template | ✓ | ✓ | ✗ | ✓ |
| Delete template | ✓ | ✓ | ✗ | ✓ |
| View templates | ✓ | ✓ | ✓ | ✓ |
| Publish to global library | ✓ | ✓ | ✗ | ✓ |
| Clone from global library | ✓ | ✓ | ✓ | ✓ |

### ITP Management

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Create ITP instance | ✓ | ✓ | ✗ | ✓ |
| View ITPs | ✓ | ✓ | ✓ | ✓ |
| Submit ITP (Draft → Open) | ✓ | ✓ | ✗ | ✓ |
| Sign off points | ✓ | ✓ | ✓ | ✓ |
| Approve ITP | ✗ | ✓ | ✓ | ✓ |
| Reject ITP | ✗ | ✓ | ✓ | ✓ |
| Deactivate ITP | ✗ | ✓ | ✗ | ✓ |
| Delete ITP | ✗ | ✗ | ✗ | ✓ |

### NCR Management

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Raise NCR | ✓ | ✓ | ✗ | ✓ |
| View NCRs | ✓ | ✓ | ✓ | ✓ |
| Update NCR details | ✓ | ✓ | ✗ | ✓ |
| Resolve NCR | ✓ | ✓ | ✗ | ✓ |
| Verify NCR | ✗ | ✓ | ✓ | ✓ |

### Media Management

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Upload media | ✓ | ✓ | ✗ | ✓ |
| View media | ✓ | ✓ | ✓ | ✓ |
| Delete media (before sign-off) | ✓ | ✓ | ✗ | ✓ |
| Delete media (after sign-off) | ✗ | ✗ | ✗ | ✗ |

### Witness Point Notifications

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Raise WP notification | ✓ | ✓ | ✗ | ✓ |
| Respond to notification | ✓ | ✓ | ✓ | ✓ |
| Cancel notification | ✓ | ✓ | ✗ | ✓ |
| Configure notice period | ✗ | ✓ | ✗ | ✓ |
| Manage default recipients | ✗ | ✓ | ✗ | ✓ |
| View notification audit | ✓ | ✓ | ✓ | ✓ |

### External Sign-Off

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Request external sign-off | ✓ | ✓ | ✗ | ✓ |
| View external sign-off status | ✓ | ✓ | ✓ | ✓ |

### PDF Reports

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| View/download reports | ✓ | ✓ | ✓ | ✓ |
| Generate on-demand report | ✓ | ✓ | ✓ | ✓ |
| Configure report branding | ✗ | ✓ | ✗ | ✓ |

### User Administration

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| View user list | ✗ | ✓ | ✗ | ✓ |
| Invite users | ✗ | ✓ | ✗ | ✓ |
| Change user roles | ✗ | ✗ | ✗ | ✓ |
| Deactivate users | ✗ | ✗ | ✗ | ✓ |
| Activate users | ✗ | ✗ | ✗ | ✓ |
| Resend invitations | ✗ | ✓ | ✗ | ✓ |
| Cancel invitations | ✗ | ✓ | ✗ | ✓ |
| View pending invitations | ✗ | ✓ | ✗ | ✓ |

## Role Summary

### Subcontractor

The Subcontractor is the primary execution role. They:
- Create and submit ITPs for inspection
- Sign off inspection points as work is completed
- Raise NCRs when defects are found
- Upload photographic evidence
- Raise witness point notifications
- Request external sign-offs

They **cannot**: create projects, approve/reject ITPs, verify NCRs, manage users, or configure system settings.

### Head Contractor

The Head Contractor is the primary management role. They:
- Create and manage projects
- Review and approve/reject ITPs
- Verify NCR resolutions
- Manage project configuration (branding, WP settings)
- Invite users to the system
- Perform all Subcontractor actions

They **cannot**: delete ITPs, change user roles, or activate/deactivate users.

### Client

The Client is the oversight role with limited write access. They:
- View all ITPs, NCRs, and project data
- Approve or reject ITPs
- Verify NCR resolutions
- Sign off inspection points
- Respond to witness point notifications
- Clone templates from the global library

They **cannot**: create ITPs, raise NCRs, upload media, manage users, or configure settings.

### Admin

The Admin has full system access. They:
- Perform all actions available to any other role
- Manage users (invite, deactivate, activate, change roles)
- Delete ITPs and other resources
- Configure all system settings
- Access all projects and data

They are the only role that can: delete ITPs, change user roles, and activate/deactivate users.

---

[← Back to User Guide](./README.md) · [Back to Documentation Index](../README.md)

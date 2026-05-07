<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
-->

# User Administration

User administration covers managing who has access to the system, what role they have, and whether their account is active. This is primarily an Admin function, though Head Contractors can also invite users.

## Understanding User Management

The system uses invitation-based registration:

- Users cannot self-register
- An authorized user (Admin or Head Contractor) must send an invitation
- The invitation assigns a role to the new user
- Users can be deactivated (but not deleted) to revoke access

## Inviting Users

### Steps

1. Navigate to **User Administration** or **Team Management**
2. Click **Invite User**
3. Fill in the invitation details:
   - **Email** — The new user's email address
   - **Role** — Select the role to assign (Subcontractor, Head Contractor, Client, or Admin)
   - **Project** — The project to associate them with (if applicable)
4. Click **Send Invitation**

### Expected Outcome

- An invitation email is sent to the specified address
- The invitation appears in the **Pending Invitations** list
- The recipient has 7 days to complete registration

### Invitation Lifecycle

| Status | Meaning |
|--------|---------|
| **Pending** | Invitation sent, awaiting registration |
| **Accepted** | User has registered successfully |
| **Expired** | 7-day window has passed without registration |

## Managing Pending Invitations

### Viewing Pending Invitations

1. Navigate to **User Administration**
2. Click **Pending Invitations**
3. View all outstanding invitations with their status and expiry

### Resending an Invitation

If a user didn't receive or lost their invitation email:

1. Find the invitation in the pending list
2. Click **Resend**
3. A new email is sent (the token remains the same)

### Cancelling an Invitation

If an invitation was sent in error:

1. Find the invitation in the pending list
2. Click **Delete** or **Cancel**
3. The invitation token is invalidated — the link will no longer work

## Role Assignment

Roles determine what a user can do in the system. Roles are assigned at invitation time and can be changed later by an Admin.

### The Four Roles

| Role | Description | Typical User |
|------|-------------|--------------|
| **Subcontractor** (role_id: 1) | Creates and executes ITPs, raises NCRs | Site supervisors, foremen |
| **Head Contractor** (role_id: 2) | Reviews and approves ITPs, manages projects | Project managers, QA managers |
| **Client** (role_id: 3) | Views and approves ITPs, read-only access | Client representatives, owners |
| **Admin** (role_id: 4) | Full system access, user management | System administrators |

### Changing a User's Role

1. Navigate to **User Administration**
2. Find the user in the list
3. Click **Edit** or the user's name
4. Change the **Role** dropdown
5. Click **Save**

The role change takes effect immediately — the user's permissions update on their next action.

## Activation and Deactivation

### Deactivating a User

When someone leaves the project or should no longer have access:

1. Navigate to **User Administration**
2. Find the user
3. Click **Deactivate**
4. The user can no longer log in or access any resources

### What Deactivation Does

- The user cannot log in
- Their existing sessions are invalidated
- Their historical data (sign-offs, NCRs, etc.) remains intact
- They appear as "Inactive" in user lists
- Their account can be reactivated at any time

### Reactivating a User

1. Navigate to **User Administration**
2. Find the deactivated user (may need to filter by "Inactive")
3. Click **Activate**
4. The user can log in again with their existing credentials

### Why Not Delete?

Users are never deleted from the system because:
- Their sign-offs and approvals are part of the audit trail
- NCRs they raised must maintain their author reference
- Quality records require traceability to specific individuals

## Viewing All Users

### Steps

1. Navigate to **User Administration**
2. The user list shows all users with:
   - Name
   - Email
   - Role
   - Status (Active/Inactive)
   - Last login date

## Role-Specific Notes

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| View user list | ✗ | ✓ | ✗ | ✓ |
| Invite users | ✗ | ✓ | ✗ | ✓ |
| Change user roles | ✗ | ✗ | ✗ | ✓ |
| Deactivate users | ✗ | ✗ | ✗ | ✓ |
| Activate users | ✗ | ✗ | ✗ | ✓ |
| Resend invitations | ✗ | ✓ | ✗ | ✓ |
| Cancel invitations | ✗ | ✓ | ✗ | ✓ |

## Tips & Common Questions

**Q: Can I invite someone who was previously deactivated?**  
A: No need — just reactivate their existing account. Their data and history are preserved.

**Q: What happens if I invite an email that's already registered?**  
A: The system will reject the invitation. Each email can only have one account.

**Q: Can a user have multiple roles?**  
A: No. Each user has exactly one role. If someone needs different access levels on different projects, they need separate accounts (different email addresses).

**Q: Who can see the user list?**  
A: Only Head Contractors and Admins can view the full user list. Subcontractors and Clients see only team members on their shared projects.

**Q: Is there a limit to how many users I can invite?**  
A: There is no system-imposed limit on the number of users.

---

[← Back to User Guide](./README.md) · [Back to Documentation Index](../README.md)

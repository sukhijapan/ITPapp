# Invitation Endpoints

[← Back to API Index](./README.md)

Invitation endpoints are rate-limited to **10 requests per minute** (same as auth endpoints).

---

## POST /api/invitations

**Authentication:** JWT required  
**Role Restriction:** Admin (4), Head Contractor (2)

Create a new user invitation. Sends an email with a registration link.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Email address to invite |
| role_id | integer | Yes | Role to assign (1=Subcontractor, 2=Head Contractor, 3=Client, 4=Admin) |
| full_name | string | Yes | Full name of the invitee |

**Success Response (201):**

```json
{
  "id": 1,
  "email": "jane@example.com",
  "full_name": "Jane Doe",
  "role_id": 1,
  "status": "pending",
  "invited_by": 4,
  "created_at": "2025-01-15T10:30:00.000Z",
  "expires_at": "2025-01-22T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Email, role_id, and full_name are required |
| 400 | Invalid role |
| 401 | Unauthorized |
| 403 | Access denied |
| 409 | Email already registered |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## GET /api/invitations/:token/validate

**Authentication:** None  
**Rate Limit:** 10 req/min

Validate an invitation token. Used by the registration page to verify the token before showing the form.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| token | string | Invitation token from the email link |

**Success Response (200):**

```json
{
  "valid": true,
  "email": "jane@example.com",
  "fullName": "Jane Doe",
  "roleId": 1
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 429 | Rate limit exceeded |
| 500 | Internal server error |

> **Note:** Returns `{ "valid": false, "error": "..." }` for invalid/expired tokens (still 200 status).

---

## GET /api/invitations/pending

**Authentication:** JWT required  
**Role Restriction:** Admin (4)

List all pending (unused) invitations.

**Success Response (200):**

```json
[
  {
    "id": 1,
    "email": "jane@example.com",
    "full_name": "Jane Doe",
    "role_id": 1,
    "status": "pending",
    "invited_by": 4,
    "created_at": "2025-01-15T10:30:00.000Z",
    "expires_at": "2025-01-22T10:30:00.000Z"
  }
]
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Access denied |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## POST /api/invitations/:id/resend

**Authentication:** JWT required  
**Role Restriction:** Admin (4), Head Contractor (2)

Resend an invitation email. Creates a new token and sends a fresh email.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Invitation ID |

**Success Response (201):**

```json
{
  "id": 2,
  "email": "jane@example.com",
  "full_name": "Jane Doe",
  "role_id": 1,
  "status": "pending",
  "invited_by": 4,
  "created_at": "2025-01-20T10:30:00.000Z",
  "expires_at": "2025-01-27T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Invalid role |
| 401 | Unauthorized |
| 403 | Access denied |
| 404 | Invitation not found |
| 409 | Email already registered |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## DELETE /api/invitations/:id

**Authentication:** JWT required  
**Role Restriction:** Admin (4), Head Contractor (2)

Cancel (invalidate) a pending invitation.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Invitation ID |

**Success Response (200):**

```json
{
  "message": "Invitation cancelled",
  "invitation": {
    "id": 1,
    "email": "jane@example.com",
    "full_name": "Jane Doe",
    "role_id": 1,
    "status": "invalidated",
    "invited_by": 4,
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Access denied |
| 404 | Invitation not found or already used |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

[← Back to API Index](./README.md) | [← Back to Documentation Index](../README.md)

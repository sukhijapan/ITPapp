# External Sign-Off Endpoints

[← Back to API Index](./README.md)

External sign-off allows internal users to request approval from external parties (e.g., clients, consultants) who don't have system accounts. A time-limited token is sent via email, and the external party can approve or reject via a public link.

Rate-limited to **200 requests per minute**.

---

## POST /api/external-sign-off/request

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Request an external sign-off for an ITP point. Sends an email with a token-based approval link.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| pointId | integer | Yes | ITP point ID to request sign-off for |
| email | string | Yes | External party's email address |
| roleName | string | Yes | Role description of the external party (e.g., "Client Engineer") |

**Success Response (201):**

```json
{
  "message": "External sign-off request sent",
  "data": {
    "id": 1,
    "itp_point_id": 5,
    "email": "client@external.com",
    "role_name": "Client Engineer",
    "token": "abc123...",
    "expires_at": "2025-01-17T10:30:00.000Z",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | pointId, email, and roleName are required |
| 401 | Unauthorized |
| 500 | Failed to request external sign-off |

---

## GET /api/external-sign-off/validate/:token

**Authentication:** None

Validate an external sign-off token and get context for the sign-off page. Used by the public sign-off UI.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| token | string | External sign-off token from the email link |

**Success Response (200):**

```json
{
  "id": 1,
  "itp_point_id": 5,
  "email": "client@external.com",
  "role_name": "Client Engineer",
  "point_description": "Excavation depth check",
  "point_type": "HP",
  "instance_name": "DW Panel 01",
  "project_name": "Bolivar WWTP Inlet Works"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Token expired / Token already used / Invalid token |

---

## POST /api/external-sign-off/execute

**Authentication:** None

Execute the external sign-off using a valid token. The external party approves or rejects the point.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | External sign-off token |
| status | string | Yes | Decision: "Approved" or "Rejected" |
| comments | string | No | Optional comments from the external party |

**Success Response (200):**

```json
{
  "message": "Sign-off completed",
  "point_status": "Approved",
  "signed_off_at": "2025-01-16T14:00:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | token and status are required |
| 400 | Token expired / Token already used / Invalid token |
| 500 | Failed to execute sign-off |

---

[← Back to API Index](./README.md) | [← Back to Documentation Index](../README.md)

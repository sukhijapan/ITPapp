# User Management Endpoints

[← Back to API Index](./README.md)

User management endpoints are rate-limited to **200 requests per minute**.

---

## GET /api/users

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

List all users with pagination and optional search.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number (minimum 1) |
| pageSize | integer | 50 | Items per page (1–100) |
| search | string | — | Search by name or email (case-insensitive partial match) |

**Success Response (200):**

```json
{
  "data": [
    {
      "id": 1,
      "full_name": "John Smith",
      "email": "john@example.com",
      "role_name": "Head Contractor",
      "is_active": true,
      "created_at": "2025-01-10T08:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "pageSize": 50
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to fetch users |

---

## PATCH /api/users/:id

**Authentication:** JWT required  
**Role Restriction:** Admin (4)

Update user details (name, role, active status).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | User ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| full_name | string | No | Updated full name |
| role_id | integer | No | New role ID (1–4) |
| is_active | boolean | No | Active status |

> At least one field must be provided.

**Success Response (200):**

```json
{
  "id": 5,
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "role_id": 2,
  "is_active": true,
  "created_at": "2025-01-10T08:00:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | No fields to update |
| 401 | Unauthorized |
| 403 | Access denied |
| 404 | User not found |
| 500 | Failed to update user |

---

## PATCH /api/users/:id/deactivate

**Authentication:** JWT required  
**Role Restriction:** Admin (4)

Deactivate a user account. Deactivated users cannot log in.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | User ID |

**Success Response (200):**

```json
{
  "id": 5,
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "role_id": 1,
  "is_active": false,
  "created_at": "2025-01-10T08:00:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Access denied |
| 404 | User not found |
| 500 | Failed to deactivate user |

---

## PATCH /api/users/:id/activate

**Authentication:** JWT required  
**Role Restriction:** Admin (4)

Reactivate a previously deactivated user account.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | User ID |

**Success Response (200):**

```json
{
  "id": 5,
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "role_id": 1,
  "is_active": true,
  "created_at": "2025-01-10T08:00:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Access denied |
| 404 | User not found |
| 500 | Failed to activate user |

---

## GET /api/roles

**Authentication:** JWT required  
**Role Restriction:** Admin (4), Head Contractor (2)

List all available roles.

**Success Response (200):**

```json
[
  { "id": 1, "name": "Subcontractor" },
  { "id": 2, "name": "Head Contractor" },
  { "id": 3, "name": "Client" },
  { "id": 4, "name": "Admin" }
]
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Access denied |
| 500 | Failed to fetch roles |

---

[← Back to API Index](./README.md) | [← Back to Documentation Index](../README.md)

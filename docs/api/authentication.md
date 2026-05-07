# Authentication Endpoints

[← Back to API Index](./README.md)

All authentication endpoints are rate-limited to **10 requests per minute** per IP.

---

## POST /api/auth/register

**Authentication:** None  
**Rate Limit:** 10 req/min

Register a new user directly (without invitation).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| full_name | string | Yes | User's full name |
| email | string | Yes | User email address |
| password | string | Yes | User password |
| role_id | integer | Yes | Role ID (1=Subcontractor, 2=Head Contractor, 3=Client, 4=Admin) |

**Success Response (201):**

```json
{
  "id": 1,
  "full_name": "John Smith",
  "email": "john@example.com",
  "role_id": 2
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 429 | Rate limit exceeded |
| 500 | User registration failed |

---

## POST /api/auth/login

**Authentication:** None  
**Rate Limit:** 10 req/min

Authenticate a user and receive a JWT token.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email address |
| password | string | Yes | User password |

**Success Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "full_name": "John Smith",
    "email": "john@example.com",
    "role_id": 2
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Invalid credentials (wrong email/password or deactivated account) |
| 429 | Rate limit exceeded |
| 500 | Login failed |

> **Note:** Deactivated users receive the same "Invalid credentials" error as incorrect passwords to prevent account enumeration.

---

## POST /api/auth/register-invite

**Authentication:** None  
**Rate Limit:** 10 req/min

Register a new user via an invitation token. The email, name, and role are pre-set by the invitation.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Invitation token received via email |
| password | string | Yes | New password (must meet password policy) |

**Success Response (201):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "role_id": 1
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Invalid or expired invitation token |
| 400 | Password validation failed (with `details` array) |
| 429 | Rate limit exceeded |
| 500 | Registration failed |

---

## POST /api/auth/forgot-password

**Authentication:** None  
**Rate Limit:** 10 req/min

Request a password reset email. Always returns a generic success message to prevent email enumeration.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Email address of the account |

**Success Response (200):**

```json
{
  "message": "If an account exists with that email, a password reset link has been sent."
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 429 | Rate limit exceeded |

> **Note:** This endpoint always returns 200 regardless of whether the email exists, to prevent enumeration attacks.

---

## GET /api/auth/reset-password/:token/validate

**Authentication:** None  
**Rate Limit:** 10 req/min

Validate a password reset token before allowing the user to set a new password.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| token | string | Password reset token from the email link |

**Success Response (200):**

```json
{
  "valid": true,
  "email": "john@example.com"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 429 | Rate limit exceeded |
| 500 | Token validation failed |

---

## POST /api/auth/reset-password

**Authentication:** None  
**Rate Limit:** 10 req/min

Execute a password reset using a valid token.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Password reset token |
| password | string | Yes | New password (must meet password policy) |

**Success Response (200):**

```json
{
  "message": "Password reset successful"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Token invalid / Token expired / Token already used |
| 400 | Password validation failed (with `details` array) |
| 429 | Rate limit exceeded |
| 500 | Password reset failed |

---

[← Back to API Index](./README.md) | [← Back to Documentation Index](../README.md)

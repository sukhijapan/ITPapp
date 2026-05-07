# API Documentation

## Overview

The Construction Quality Management API is a RESTful JSON API built with Express.js, deployed as an AWS Lambda function via `serverless-http`.

## Base URL

| Environment | Base URL |
|-------------|----------|
| Local Development | `http://localhost:3000/api` |
| Production | Lambda Function URL (e.g., `https://<function-url>.lambda-url.ap-southeast-2.on.aws/api`) |

## Authentication

Most endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are obtained via the [login endpoint](./authentication.md#post-apiauthlogin) and expire after 24 hours.

The JWT payload contains:
- `userId` — the authenticated user's ID
- `roleId` — the user's role (1=Subcontractor, 2=Head Contractor, 3=Client, 4=Admin)

## Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Auth endpoints (`/api/auth/*`, `/api/invitations/*`) | 10 requests | 1 minute |
| General API (all other endpoints) | 200 requests | 1 minute |

Rate limit headers are included in responses (`RateLimit-*` standard headers). When exceeded, the API returns:

```json
{ "error": "Too many requests, please try again later." }
```

## Roles

| ID | Role | Description |
|----|------|-------------|
| 1 | Subcontractor | Executes inspection work, raises NCRs and WP notifications |
| 2 | Head Contractor | Manages projects, templates, approves ITPs, configures settings |
| 3 | Client | Reviews and approves ITPs, signs off inspection points |
| 4 | Admin | Full system access, user management, all operations |

## Error Response Format

All error responses follow a consistent format:

```json
{ "error": "Description of what went wrong" }
```

Common HTTP status codes:
- `400` — Bad request (validation error, invalid state transition)
- `401` — Unauthorized (missing or invalid token)
- `403` — Forbidden (insufficient role permissions)
- `404` — Resource not found
- `409` — Conflict (duplicate resource)
- `429` — Rate limit exceeded
- `500` — Internal server error

## Endpoint Documentation

### Core Resources
- [Authentication](./authentication.md) — Register, login, password reset
- [Projects](./projects.md) — Project CRUD and dashboard stats
- [Templates](./templates.md) — ITP template management and global library
- [ITPs](./itps.md) — ITP instance lifecycle and point sign-off
- [NCRs](./ncrs.md) — Non-Conformance Report management

### Supporting Resources
- [Media](./media.md) — File uploads and attachments
- [Invitations](./invitations.md) — User invitation and onboarding
- [External Sign-Off](./external-sign-off.md) — Token-based external approvals
- [Users](./users.md) — User management and roles
- [Witness Points](./witness-points.md) — WP notifications and responses
- [Logos](./logos.md) — Project logo management

---

[← Back to Documentation Index](../README.md)

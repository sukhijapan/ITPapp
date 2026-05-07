# Logo Endpoints

[← Back to API Index](./README.md)

Logo endpoints manage project logos used in PDF report branding. Logos are stored in S3 with a 2MB size limit.

Rate-limited to **200 requests per minute**.

---

## POST /api/projects/:id/logo

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Admin (4)

Upload or replace a project logo. Accepts image files up to 2MB via multipart form data.

**Content-Type:** `multipart/form-data`

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| logo | file | Yes | Logo image file (max 2MB) |

**Success Response (201):**

```json
{
  "s3Key": "logos/project-1/logo-1705312200000.png",
  "message": "Logo uploaded successfully."
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | No file uploaded. Please provide a logo image. |
| 400 | Invalid file type or size |
| 401 | Unauthorized |
| 403 | Access denied |
| 500 | Failed to upload logo. |

---

## GET /api/projects/:id/logo

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get logo metadata and base64-encoded image data for a project.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |

**Success Response (200) — Logo exists:**

```json
{
  "hasLogo": true,
  "logoBase64": "data:image/png;base64,iVBORw0KGgo...",
  "uploadedAt": "2025-01-15T10:30:00.000Z"
}
```

**Success Response (200) — No logo:**

```json
{
  "hasLogo": false,
  "uploadedAt": null
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |

> **Note:** This endpoint always returns 200, even if no logo exists or an error occurs fetching it.

---

## DELETE /api/projects/:id/logo

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Admin (4)

Remove the logo for a project. Deletes from S3 and clears the database reference.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |

**Success Response (204):** No content

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Access denied |
| 500 | Failed to delete logo. |

---

[← Back to API Index](./README.md) | [← Back to Documentation Index](../README.md)

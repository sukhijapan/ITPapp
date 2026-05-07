# Project Endpoints

[← Back to API Index](./README.md)

All project endpoints require JWT authentication and are rate-limited to **200 requests per minute**.

---

## POST /api/projects

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Admin (4)

Create a new project.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Project name |
| description | string | No | Project description |

**Success Response (201):**

```json
{
  "id": 1,
  "name": "Bolivar WWTP Inlet Works",
  "description": "Inlet structure construction",
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized — missing or invalid token |
| 403 | Access denied — insufficient role |
| 500 | Project creation failed |

---

## GET /api/projects

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

List all projects with pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number (minimum 1) |
| pageSize | integer | 50 | Items per page (1–100) |

**Success Response (200):**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Bolivar WWTP Inlet Works",
      "description": "Inlet structure construction",
      "created_at": "2025-01-15T10:30:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 50
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to fetch projects |

---

## GET /api/projects/stats

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get aggregated ITP, HP, and NCR statistics across all projects or filtered by project.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_id | integer | No | Filter stats to a specific project |

**Success Response (200):**

```json
{
  "draft_itps": "2",
  "pending_itps": "1",
  "open_itps": "5",
  "closed_itps": "12",
  "total_itps": "20",
  "blocking_hps": "3",
  "open_ncrs": "2"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to fetch stats |

---

## GET /api/projects/:id

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get a single project by ID.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |

**Success Response (200):**

```json
{
  "id": 1,
  "name": "Bolivar WWTP Inlet Works",
  "description": "Inlet structure construction",
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 404 | Project not found |
| 500 | Failed to fetch project |

---

## PUT /api/projects/:id/report-config

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Admin (4)

Update the PDF report branding configuration for a project.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| companyName | string | No | Company name for report header |
| docNumberPrefix | string | No | Document number prefix (e.g., "8D91-ITP") |
| defaultRevision | string | No | Default revision string (e.g., "Rev 0") |
| projectSubtitle | string | No | Subtitle displayed on reports |

**Success Response (200):**

```json
{
  "project_id": 1,
  "company_name": "Fulton Hogan",
  "doc_number_prefix": "8D91-ITP",
  "default_revision": "Rev 0",
  "project_subtitle": "Bolivar WWTP Upgrade"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Invalid configuration values |
| 401 | Unauthorized |
| 403 | Access denied |
| 404 | Project not found |
| 500 | Failed to update report configuration |

---

## GET /api/projects/:id/report-config

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get the resolved PDF report configuration for a project (merges project-specific overrides with defaults).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |

**Success Response (200):**

```json
{
  "company_name": "Fulton Hogan",
  "doc_number_prefix": "8D91-ITP",
  "default_revision": "Rev 0",
  "project_subtitle": "Bolivar WWTP Upgrade"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 404 | Project not found |
| 500 | Failed to fetch report configuration |

---

[← Back to API Index](./README.md) | [← Back to Documentation Index](../README.md)

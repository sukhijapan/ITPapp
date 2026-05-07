# Template Endpoints

[← Back to API Index](./README.md)

All template endpoints require JWT authentication and are rate-limited to **200 requests per minute**.

---

## POST /api/templates

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Admin (4)

Create a new ITP template with inspection points.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| project_id | integer | No | Project to associate template with (null for global) |
| name | string | Yes | Template name |
| description | string | No | Template description |
| trade_category | string | No | Trade category (e.g., "Earthworks", "Concrete") |
| is_public | boolean | No | Whether template is in the global library (default: false) |
| version | string | No | Version string (default: "1.0") |
| created_by_org | string | No | Organization that created the template |
| points | array | No | Array of template point objects |

**Point Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sequence | integer | Yes | Point order number |
| description | string | Yes | Inspection point description |
| type | string | Yes | Point type: HP, WP, RP, SP, or IP |
| acceptance_criteria | string | No | Acceptance criteria text |
| reference_documents | string | No | Reference document codes |
| inspection_method | string | No | Method of inspection |
| frequency | string | No | Inspection frequency |
| responsible_party | string | No | Responsible party description |
| section | string | No | Section grouping |
| verifying_records | string | No | Required verifying records |
| approver_role_id | integer | No | Role ID required to sign off (1–4) |

**Success Response (201):**

```json
{
  "id": 1,
  "project_id": 1,
  "name": "Diaphragm Wall",
  "description": "DW panel construction inspection",
  "trade_category": "Concrete",
  "is_public": false,
  "version": "1.0",
  "created_by_org": null,
  "created_at": "2025-01-15T10:30:00.000Z",
  "points": [...]
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Access denied |
| 409 | A template with that name already exists in this project |
| 500 | Template creation failed |

---

## GET /api/templates

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

List templates, optionally filtered by project.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_id | integer | No | Filter templates by project ID |

**Success Response (200):**

```json
[
  {
    "id": 1,
    "project_id": 1,
    "name": "Diaphragm Wall",
    "description": "DW panel construction inspection",
    "trade_category": "Concrete",
    "is_public": false,
    "version": "1.0",
    "clone_count": 0,
    "created_at": "2025-01-15T10:30:00.000Z"
  }
]
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to fetch templates |

---

## GET /api/templates/library

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get all public templates from the global library, ordered by clone count (most popular first).

**Success Response (200):**

```json
[
  {
    "id": 10,
    "project_id": null,
    "name": "CFA Piles",
    "description": "Continuous Flight Auger pile installation",
    "trade_category": "Earthworks",
    "is_public": true,
    "version": "1.0",
    "created_by_org": "Fulton Hogan",
    "clone_count": 15,
    "created_at": "2025-01-10T08:00:00.000Z"
  }
]
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to fetch library |

---

## POST /api/templates/:id/clone

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Clone a template (typically from the global library) into a specific project.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Template ID to clone |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| project_id | integer | Yes | Target project ID for the cloned template |

**Success Response (201):**

```json
{
  "id": 15,
  "project_id": 1,
  "name": "CFA Piles",
  "description": "Continuous Flight Auger pile installation",
  "trade_category": "Earthworks",
  "is_public": false,
  "created_at": "2025-01-20T14:00:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Cloning failed |

---

## POST /api/templates/:id/publish

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Admin (4)

Publish a project template to the global library. This removes the project association and makes it publicly available.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Template ID to publish |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| trade_category | string | Yes | Trade category for library organization |
| version | string | No | Version string (default: "1.0") |
| created_by_org | string | Yes | Organization name for attribution |

**Success Response (200):**

```json
{
  "id": 1,
  "project_id": null,
  "name": "Diaphragm Wall",
  "trade_category": "Concrete",
  "is_public": true,
  "version": "1.0",
  "created_by_org": "Fulton Hogan"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Access denied |
| 404 | Template not found |
| 500 | Publishing failed |

---

## GET /api/templates/:id

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get a template by ID including all its points.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Template ID |

**Success Response (200):**

```json
{
  "id": 1,
  "project_id": 1,
  "name": "Diaphragm Wall",
  "description": "DW panel construction inspection",
  "trade_category": "Concrete",
  "is_public": false,
  "version": "1.0",
  "points": [
    {
      "id": 1,
      "sequence": 1,
      "description": "Excavation depth check",
      "type": "HP",
      "acceptance_criteria": "Within ±50mm of design depth",
      "reference_documents": "DWG-001",
      "inspection_method": "Survey measurement",
      "frequency": "Each panel",
      "responsible_party": "Surveyor",
      "section": "Excavation",
      "verifying_records": "Survey report",
      "approver_role_id": 2
    }
  ]
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 404 | Template not found |
| 500 | Failed to fetch template |

---

## DELETE /api/templates/:id

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Admin (4)

Permanently delete a template and all related data (instances, points, NCRs, media, audit logs).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Template ID |

**Success Response (200):**

```json
{
  "message": "Template and all related data permanently deleted"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Access denied |
| 404 | Template not found |
| 500 | Failed to delete template |

> **Warning:** This is a destructive operation that cascades through all ITP instances created from this template, their points, NCRs, media, and audit logs.

---

[← Back to API Index](./README.md) | [← Back to Documentation Index](../README.md)

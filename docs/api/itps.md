# ITP Instance Endpoints

[← Back to API Index](./README.md)

All ITP endpoints require JWT authentication and are rate-limited to **200 requests per minute**.

---

## POST /api/itps/instances

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Create a new ITP instance from a template. Copies all template points into the instance. The instance starts in "Draft" status.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| template_id | integer | Yes | Source template ID |
| project_id | integer | Yes | Project to create the instance in |
| name | string | Yes | Instance name (must be unique within project) |
| lot_number | string | No | Lot/location number |
| revision | string | No | Revision identifier |
| drawing_ref | string | No | Drawing reference |
| panel_no | string | No | Panel number |

**Success Response (201):**

```json
{
  "id": 1,
  "template_id": 1,
  "project_id": 1,
  "name": "DW Panel 01",
  "status": "Draft",
  "lot_number": "LOT-A",
  "revision": "Rev 0",
  "drawing_ref": "DWG-001",
  "panel_no": "P01",
  "created_by": 1,
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Template has no points |
| 401 | Unauthorized |
| 409 | An ITP with that name already exists in this project |
| 500 | Failed to create ITP instance |

---

## GET /api/itps/instances

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

List all ITP instances, optionally filtered by project.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_id | integer | No | Filter by project ID |

**Success Response (200):**

```json
[
  {
    "id": 1,
    "template_id": 1,
    "project_id": 1,
    "name": "DW Panel 01",
    "status": "Open",
    "lot_number": "LOT-A",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
]
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to fetch instances |

---

## GET /api/itps/instances/:id

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get a single ITP instance with all its points, signer information, pending external sign-offs, and NCRs.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Instance ID |

**Success Response (200):**

```json
{
  "id": 1,
  "template_id": 1,
  "project_id": 1,
  "name": "DW Panel 01",
  "status": "Open",
  "lot_number": "LOT-A",
  "revision": "Rev 0",
  "drawing_ref": "DWG-001",
  "panel_no": "P01",
  "created_by": 1,
  "created_at": "2025-01-15T10:30:00.000Z",
  "points": [
    {
      "id": 1,
      "instance_id": 1,
      "sequence": 1,
      "description": "Excavation depth check",
      "type": "HP",
      "status": "Open",
      "acceptance_criteria": "Within ±50mm",
      "signed_off_by": null,
      "signed_off_at": null,
      "signed_off_by_name": null,
      "signed_off_by_role": null,
      "pending_external_email": null,
      "pending_external_role": null,
      "pending_external_expires": null,
      "approver_role_id": 2,
      "ncrs": []
    }
  ]
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 404 | Instance not found |
| 500 | Failed to fetch instance |

---

## POST /api/itps/instances/:id/submit

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Submit a Draft ITP for review. Transitions status from "Draft" to "Pending Review".

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Instance ID |

**Success Response (200):**

```json
{
  "message": "ITP submitted for review"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | ITP is not in Draft status |
| 401 | Unauthorized |
| 404 | Instance not found |
| 500 | Failed to submit ITP for review |

---

## POST /api/itps/instances/:id/approve

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Client (3), Admin (4)

Approve a Pending Review ITP. Transitions status from "Pending Review" to "Open".

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Instance ID |

**Success Response (200):**

```json
{
  "message": "ITP approved and is now Open for execution"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | ITP must be in Pending Review status |
| 401 | Unauthorized |
| 403 | Access denied |
| 404 | Instance not found |
| 500 | Failed to approve ITP |

---

## POST /api/itps/instances/:id/reject

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Client (3), Admin (4)

Reject a Pending Review ITP. Transitions status back to "Draft".

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Instance ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Reason for rejection (stored in closure_notes) |

**Success Response (200):**

```json
{
  "message": "ITP rejected and returned to Draft"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Only Pending Review ITPs can be rejected |
| 401 | Unauthorized |
| 403 | Access denied |
| 404 | Instance not found |
| 500 | Failed to reject ITP |

---

## POST /api/itps/instances/:id/deactivate

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Admin (4)

Deactivate (close) an ITP instance manually.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Instance ID |

**Success Response (200):**

```json
{
  "message": "ITP deactivated"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | ITP is already closed |
| 401 | Unauthorized |
| 403 | Access denied |
| 404 | Instance not found |
| 500 | Failed to deactivate ITP |

---

## DELETE /api/itps/instances/:id

**Authentication:** JWT required  
**Role Restriction:** Admin (4)

Permanently delete an ITP instance and all related data (points, NCRs, media, audit logs, WP notifications).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Instance ID |

**Success Response (200):**

```json
{
  "message": "ITP instance permanently deleted"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Access denied |
| 404 | Instance not found |
| 500 | Failed to delete ITP |

> **Warning:** This is a destructive, irreversible operation.

---

## GET /api/itps/instances/:id/report

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Generate and download a PDF report for an ITP instance.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Instance ID |

**Success Response (200):**

Returns a binary PDF file with headers:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="ITP_<name>_<id>.pdf"`
- `Cache-Control: no-store`

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 404 | Instance not found |
| 500 | Failed to generate report |

---

## POST /api/itps/points/:id/sign-off

**Authentication:** JWT required  
**Role Restriction:** All authenticated users (role-based enforcement per point)

Sign off an ITP inspection point. Enforces:
- ITP must be in "Open" status
- Role-based approval (if `approver_role_id` is set on the point, only that role or Admin can sign off)
- Preceding Hold Points (HP) must be signed off first
- Open NCRs block "Approved" status

When all points are signed off, the ITP auto-closes and a PDF report is generated.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Point ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | New status: "Approved" or "Rejected" |
| comments | string | No | Sign-off comments |

**Success Response (200):**

```json
{
  "id": 1,
  "instance_id": 1,
  "sequence": 1,
  "description": "Excavation depth check",
  "type": "HP",
  "status": "Approved",
  "signed_off_by": 2,
  "signed_off_at": "2025-01-20T14:30:00.000Z",
  "comments": "Depth verified at -12.5m"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | ITP must be Open / Preceding HP not signed off / Open NCR blocks approval |
| 401 | Unauthorized |
| 403 | Role mismatch — point requires a specific role for sign-off |
| 404 | Point not found |
| 500 | Failed to sign off point |

---

[← Back to API Index](./README.md) | [← Back to Documentation Index](../README.md)

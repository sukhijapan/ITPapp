# NCR Endpoints

[← Back to API Index](./README.md)

All NCR endpoints require JWT authentication and are rate-limited to **200 requests per minute**.

---

## GET /api/ncrs

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

List all NCRs with context (point, instance, project, author). Ordered by status (Open first) then by creation date (newest first).

**Success Response (200):**

```json
[
  {
    "id": 1,
    "title": "Concrete cover insufficient",
    "description": "Concrete cover insufficient",
    "status": "Open",
    "created_at": "2025-01-20T09:00:00.000Z",
    "resolved_at": null,
    "itp_point_id": 5,
    "point_sequence": 3,
    "point_description": "Cover meter check",
    "point_type": "HP",
    "point_status": "Rejected",
    "instance_id": 1,
    "instance_name": "DW Panel 01",
    "lot_number": "LOT-A",
    "panel_no": "P01",
    "project_id": 1,
    "project_name": "Bolivar WWTP Inlet Works",
    "created_by_name": "John Smith",
    "created_by_role": "Head Contractor"
  }
]
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to fetch NCRs |

---

## GET /api/ncrs/:id

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get a single NCR with full detail including point context, instance info, project, creator, signer, and audit trail.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | NCR ID |

**Success Response (200):**

```json
{
  "id": 1,
  "title": "Concrete cover insufficient",
  "description": "Concrete cover insufficient",
  "status": "Open",
  "category": null,
  "reported_to": null,
  "client_contact": null,
  "contractor_contact": null,
  "root_cause": null,
  "proposed_disposition": null,
  "proposed_completion_date": null,
  "corrective_action": null,
  "rectification_complete": null,
  "verified_by_contractor": null,
  "verified_by_client": null,
  "closing_remarks": null,
  "created_at": "2025-01-20T09:00:00.000Z",
  "resolved_at": null,
  "itp_point_id": 5,
  "point_sequence": 3,
  "point_description": "Cover meter check",
  "point_type": "HP",
  "point_status": "Rejected",
  "instance_id": 1,
  "instance_name": "DW Panel 01",
  "instance_status": "Open",
  "lot_number": "LOT-A",
  "panel_no": "P01",
  "project_id": 1,
  "project_name": "Bolivar WWTP Inlet Works",
  "created_by_name": "John Smith",
  "created_by_email": "john@example.com",
  "created_by_role": "Head Contractor",
  "audit_trail": [
    {
      "id": 1,
      "action": "CREATE_NCR",
      "new_status": "Rejected",
      "metadata": { "ncr_id": 1, "description": "Concrete cover insufficient" },
      "timestamp": "2025-01-20T09:00:00.000Z",
      "full_name": "John Smith"
    }
  ]
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 404 | NCR not found |
| 500 | Failed to fetch NCR |

---

## GET /api/ncrs/point/:itp_point_id

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get all NCRs linked to a specific ITP point.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| itp_point_id | integer | ITP point ID |

**Success Response (200):**

```json
[
  {
    "id": 1,
    "itp_point_id": 5,
    "title": "Concrete cover insufficient",
    "description": "Concrete cover insufficient",
    "status": "Open",
    "created_by": 2,
    "created_at": "2025-01-20T09:00:00.000Z",
    "resolved_at": null
  }
]
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to fetch NCRs |

---

## POST /api/ncrs

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Create a new NCR. This also:
1. Sets the linked ITP point status to "Rejected"
2. Records the rejection in the audit log
3. Sends a notification (non-blocking)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| itp_point_id | integer | Yes | ITP point ID to raise the NCR against |
| description | string | Yes | NCR description (also used as title) |

**Success Response (201):**

```json
{
  "id": 1,
  "itp_point_id": 5,
  "title": "Concrete cover insufficient",
  "description": "Concrete cover insufficient",
  "status": "Open",
  "created_by": 2,
  "created_at": "2025-01-20T09:00:00.000Z",
  "resolved_at": null
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to create NCR |

---

## PUT /api/ncrs/:id

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Update NCR detail fields (investigation, corrective action, verification).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | NCR ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| description | string | No | Updated description |
| category | string | No | NCR category |
| reported_to | string | No | Person/entity reported to |
| client_contact | string | No | Client contact name |
| contractor_contact | string | No | Contractor contact name |
| root_cause | string | No | Root cause analysis |
| proposed_disposition | string | No | Proposed disposition |
| proposed_completion_date | string | No | Target completion date (ISO format) |
| corrective_action | string | No | Corrective action taken |
| rectification_complete | boolean | No | Whether rectification is complete |
| verified_by_contractor | string | No | Contractor verification details |
| verified_by_client | string | No | Client verification details |
| closing_remarks | string | No | Closing remarks |

**Success Response (200):**

```json
{
  "id": 1,
  "itp_point_id": 5,
  "title": "Concrete cover insufficient",
  "description": "Concrete cover insufficient",
  "status": "Open",
  "category": "Structural",
  "root_cause": "Spacer displacement during pour",
  "corrective_action": "Break out and re-pour affected section",
  "created_at": "2025-01-20T09:00:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 404 | NCR not found |
| 500 | Failed to update NCR |

---

## POST /api/ncrs/:id/resolve

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Resolve (close) an NCR. Sets status to "Closed" so it no longer blocks HP sign-off.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | NCR ID |

**Success Response (200):**

```json
{
  "id": 1,
  "itp_point_id": 5,
  "title": "Concrete cover insufficient",
  "description": "Concrete cover insufficient",
  "status": "Closed",
  "resolved_at": "2025-01-25T16:00:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to resolve NCR |

---

[← Back to API Index](./README.md) | [← Back to Documentation Index](../README.md)

# Witness Point Notification Endpoints

[← Back to API Index](./README.md)

Witness Point (WP) notifications allow subcontractors and head contractors to notify relevant parties of upcoming inspections. Recipients can confirm attendance, decline, or request a reschedule. If no response is received before the notice period expires, the witness point is automatically waived.

Rate-limited to **200 requests per minute**.

---

## POST /api/wp-notifications

**Authentication:** JWT required  
**Role Restriction:** Subcontractor (1), Head Contractor (2)

Create a witness point notification for an ITP point.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| pointId | integer | Yes | ITP point ID (must be a WP type point) |
| plannedInspectionTime | string | Yes | ISO 8601 datetime of planned inspection |
| location | string | No | Location description |
| scope | string | No | Scope of work description |
| recipientIds | array | No | Array of internal user IDs to notify |
| externalRecipients | array | No | Array of external recipient objects |

**External Recipient Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Recipient email |
| name | string | Yes | Recipient name |

**Success Response (201):**

```json
{
  "message": "Notification created",
  "data": {
    "id": 1,
    "itp_point_id": 10,
    "itp_instance_id": 1,
    "created_by": 1,
    "status": "Pending",
    "planned_inspection_time": "2025-01-20T09:00:00.000Z",
    "expiry_time": "2025-01-19T09:00:00.000Z",
    "location_description": "Grid B3, Level 2",
    "scope_of_work": "Rebar inspection before pour",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | pointId and plannedInspectionTime are required |
| 400 | Notification already exists for this point |
| 403 | Only Subcontractors and Head Contractors can raise notifications |
| 404 | Point not found |
| 500 | Internal server error |

---

## GET /api/wp-notifications/:id

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get a notification by its ID.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Notification ID |

**Success Response (200):**

```json
{
  "data": {
    "id": 1,
    "itp_point_id": 10,
    "itp_instance_id": 1,
    "created_by": 1,
    "status": "Pending",
    "planned_inspection_time": "2025-01-20T09:00:00.000Z",
    "expiry_time": "2025-01-19T09:00:00.000Z",
    "location_description": "Grid B3, Level 2",
    "scope_of_work": "Rebar inspection before pour",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 404 | Notification not found |
| 500 | Internal server error |

---

## GET /api/wp-notifications/point/:pointId

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get the current notification for a specific ITP point.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| pointId | integer | ITP point ID |

**Success Response (200):**

```json
{
  "data": {
    "id": 1,
    "itp_point_id": 10,
    "status": "Pending",
    "planned_inspection_time": "2025-01-20T09:00:00.000Z",
    "expiry_time": "2025-01-19T09:00:00.000Z"
  }
}
```

> Returns `{ "data": null }` if no notification exists for the point.

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | pointId is required |
| 401 | Unauthorized |
| 500 | Internal server error |

---

## POST /api/wp-notifications/:id/cancel

**Authentication:** JWT required  
**Role Restriction:** Notification creator only

Cancel a pending notification.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Notification ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Reason for cancellation |

**Success Response (200):**

```json
{
  "message": "Notification cancelled",
  "data": {
    "id": 1,
    "status": "Cancelled"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Only pending notifications can be cancelled |
| 401 | Unauthorized |
| 403 | Only the notification creator can cancel a notification |
| 404 | Notification not found |
| 500 | Internal server error |

---

## POST /api/wp-notifications/:id/respond

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Respond to a notification as an authenticated internal user.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Notification ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| responseType | string | Yes | One of: "confirm", "decline", "reschedule" |
| reason | string | Conditional | Required when responseType is "decline" |
| requestedTime | string | Conditional | Required when responseType is "reschedule" (ISO 8601) |

**Success Response (200):**

```json
{
  "message": "Notification confirmed",
  "data": {
    "id": 1,
    "status": "Confirmed"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | responseType is required |
| 400 | responseType must be 'confirm', 'decline', or 'reschedule' |
| 400 | reason is required when declining |
| 400 | requestedTime is required when requesting a reschedule |
| 401 | Unauthorized |
| 500 | Internal server error |

---

## GET /api/wp-notifications/:id/remaining-time

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get the remaining time until the planned inspection for a notification.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Notification ID |

**Success Response (200):**

```json
{
  "data": {
    "remainingMs": 86400000,
    "remainingHours": 24,
    "expiryTime": "2025-01-19T09:00:00.000Z",
    "plannedInspectionTime": "2025-01-20T09:00:00.000Z",
    "isExpired": false
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 404 | Notification not found |
| 500 | Internal server error |

---

## GET /api/wp-notifications/audit

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Query the witness point audit trail with filters.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| instanceId | integer | No | Filter by ITP instance ID |
| pointId | integer | No | Filter by ITP point ID |
| status | string | No | Filter by notification status |
| dateFrom | string | No | Start date filter (ISO 8601) |
| dateTo | string | No | End date filter (ISO 8601) |
| limit | integer | No | Max results to return |
| offset | integer | No | Pagination offset |

**Success Response (200):**

```json
{
  "data": [
    {
      "id": 1,
      "itp_point_id": 10,
      "status": "Confirmed",
      "planned_inspection_time": "2025-01-20T09:00:00.000Z",
      "created_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to fetch audit trail |

---

## GET /api/wp-notifications/token/:token/validate

**Authentication:** None

Validate a response token and return notification context. Used by the public response page for external recipients.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| token | string | Response token from the email link |

**Success Response (200):**

```json
{
  "data": {
    "notificationId": 1,
    "projectName": "Bolivar WWTP Inlet Works",
    "itpName": "DW Panel 01",
    "pointDescription": "Rebar inspection",
    "plannedInspectionTime": "2025-01-20T09:00:00.000Z",
    "location": "Grid B3, Level 2",
    "scope": "Rebar inspection before pour",
    "recipientName": "External Engineer",
    "recipientEmail": "engineer@external.com"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Token is required |
| 400 | This response link has already been used |
| 400 | This notification has expired |
| 400 | This notification has already been responded to |
| 404 | Invalid or expired response link |
| 500 | Failed to validate token |

---

## POST /api/wp-notifications/token/:token/respond

**Authentication:** None

Respond to a notification via a response token (for external recipients).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| token | string | Response token from the email link |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| responseType | string | Yes | One of: "confirm", "decline", "reschedule" |
| reason | string | Conditional | Required when responseType is "decline" |
| requestedTime | string | Conditional | Required when responseType is "reschedule" (ISO 8601) |

**Success Response (200):**

```json
{
  "message": "Notification confirmed",
  "data": {
    "id": 1,
    "status": "Confirmed"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Token is required |
| 400 | responseType is required |
| 400 | responseType must be 'confirm', 'decline', or 'reschedule' |
| 400 | reason is required when declining |
| 400 | requestedTime is required when requesting a reschedule |
| 400 | Token already used / Token expired |
| 404 | Invalid token |
| 500 | Internal server error |

---

## POST /api/wp-notifications/:id/auto-waive

**Authentication:** Internal secret header (`x-internal-secret`)  
**Role Restriction:** Internal Lambda only

Process auto-waiver for a notification when the notice period expires. Called by the EventBridge timer Lambda.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Notification ID |

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| x-internal-secret | Yes | Must match `INTERNAL_API_SECRET` environment variable |

**Success Response (200):**

```json
{
  "message": "Auto-waiver processed",
  "data": {
    "id": 1,
    "status": "Auto-Waived"
  }
}
```

> Returns `{ "message": "No action needed (notification already processed)", "data": null }` if already handled (idempotent).

**Error Responses:**

| Status | Description |
|--------|-------------|
| 403 | Access denied (invalid or missing internal secret) |
| 404 | Notification not found |
| 500 | Internal server error |

---

## Project WP Configuration Endpoints

These endpoints manage the witness point configuration for a project (notice period, default recipients).

---

## GET /api/projects/:id/wp-config

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get the witness point configuration for a project including default recipients.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |

**Success Response (200):**

```json
{
  "data": {
    "project_id": 1,
    "notice_period_hours": 24,
    "defaultRecipients": [
      {
        "id": 1,
        "project_id": 1,
        "user_id": 3,
        "email": "client@example.com",
        "recipient_name": "Client Engineer",
        "is_external": false,
        "role_filter": null
      }
    ]
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to fetch project WP configuration |

---

## PUT /api/projects/:id/wp-config

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Admin (4)

Update the witness point configuration for a project.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| noticePeriodHours | integer | Yes | Notice period in hours before planned inspection |

**Success Response (200):**

```json
{
  "message": "Configuration updated",
  "data": {
    "project_id": 1,
    "notice_period_hours": 48
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | noticePeriodHours is required |
| 401 | Unauthorized |
| 403 | Only Head Contractors and Admins can configure notification settings |
| 500 | Internal server error |

---

## POST /api/projects/:id/wp-config/recipients

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Admin (4)

Add a default recipient to the project's WP notification configuration.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Recipient email address |
| userId | integer | No | Internal user ID (null for external recipients) |
| recipientName | string | No | Display name for the recipient |
| isExternal | boolean | No | Whether recipient is external (default: false) |
| roleFilter | string | No | Role filter for conditional inclusion |

**Success Response (201):**

```json
{
  "message": "Recipient added",
  "data": {
    "id": 1,
    "project_id": 1,
    "user_id": null,
    "email": "inspector@external.com",
    "recipient_name": "External Inspector",
    "is_external": true,
    "role_filter": null
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Recipient email is required |
| 401 | Unauthorized |
| 403 | Only Head Contractors and Admins can configure notification settings |
| 500 | Internal server error |

---

## DELETE /api/projects/:id/wp-config/recipients/:recipientId

**Authentication:** JWT required  
**Role Restriction:** Head Contractor (2), Admin (4)

Remove a default recipient from the project's WP notification configuration.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |
| recipientId | integer | Recipient record ID |

**Success Response (200):**

```json
{
  "message": "Recipient removed"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Only Head Contractors and Admins can configure notification settings |
| 500 | Internal server error |

---

[← Back to API Index](./README.md) | [← Back to Documentation Index](../README.md)

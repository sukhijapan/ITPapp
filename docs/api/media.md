# Media Endpoints

[← Back to API Index](./README.md)

All media endpoints require JWT authentication and are rate-limited to **200 requests per minute**.

Media files are stored in AWS S3. The API supports both direct upload (multipart form) and presigned URL upload (for large files or direct browser-to-S3 uploads).

---

## POST /api/media/upload

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Upload a file directly via multipart form data. The file is stored in S3 and a media record is created.

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | File to upload (max 10MB) |
| itp_point_id | integer | Yes | ITP point to attach the file to |
| latitude | number | No | GPS latitude coordinate |
| longitude | number | No | GPS longitude coordinate |

**Success Response (201):**

```json
{
  "id": 1,
  "itp_point_id": 5,
  "file_path": "uploads/1705312200000-photo.jpg",
  "file_type": "image/jpeg",
  "uploaded_by": 2,
  "latitude": -34.7749,
  "longitude": 138.5194,
  "uploaded_at": "2025-01-15T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | No file uploaded |
| 401 | Unauthorized |
| 500 | Failed to upload media |

---

## POST /api/media/upload-url

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Generate a presigned S3 URL for direct browser-to-S3 upload. Creates the media record immediately and returns the upload URL.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| filename | string | Yes | Original filename (used for S3 key and content type detection) |
| contentType | string | No | MIME type (auto-detected from extension if not provided) |
| itp_point_id | integer | Yes | ITP point to attach the file to |
| latitude | number | No | GPS latitude coordinate |
| longitude | number | No | GPS longitude coordinate |

**Supported file extensions:** `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.csv`, `.txt`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`

**Success Response (201):**

```json
{
  "uploadUrl": "https://bucket.s3.ap-southeast-2.amazonaws.com/uploads/1705312200000-photo.jpg?X-Amz-Algorithm=...",
  "media": {
    "id": 1,
    "itp_point_id": 5,
    "file_path": "uploads/1705312200000-photo.jpg",
    "file_type": "image/jpeg",
    "uploaded_by": 2,
    "latitude": -34.7749,
    "longitude": 138.5194,
    "uploaded_at": "2025-01-15T10:30:00.000Z"
  }
}
```

> **Note:** The presigned URL expires after 5 minutes. The client must PUT the file to the URL within that window.

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | filename and itp_point_id are required |
| 401 | Unauthorized |
| 500 | Failed to generate upload URL |

---

## DELETE /api/media/:id

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Delete a media attachment. Removes the file from S3 and the database record.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Media ID |

**Success Response (200):**

```json
{
  "message": "Attachment deleted"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Cannot delete attachment after sign-off |
| 404 | Media not found |
| 500 | Failed to delete attachment |

> **Note:** Media cannot be deleted after the associated ITP point has been signed off.

---

## GET /api/media/instance/:instance_id

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get all media for an ITP instance in a single request (batch endpoint). Returns signed URLs valid for 1 hour.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| instance_id | integer | ITP instance ID |

**Success Response (200):**

```json
[
  {
    "id": 1,
    "itp_point_id": 5,
    "file_path": "uploads/1705312200000-photo.jpg",
    "file_type": "image/jpeg",
    "uploaded_by": 2,
    "latitude": -34.7749,
    "longitude": 138.5194,
    "uploaded_at": "2025-01-15T10:30:00.000Z",
    "url": "https://bucket.s3.ap-southeast-2.amazonaws.com/uploads/1705312200000-photo.jpg?X-Amz-Algorithm=..."
  }
]
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to fetch instance media |

---

## GET /api/media/point/:itp_point_id

**Authentication:** JWT required  
**Role Restriction:** All authenticated users

Get all media for a specific ITP point. Returns signed URLs valid for 1 hour.

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
    "file_path": "uploads/1705312200000-photo.jpg",
    "file_type": "image/jpeg",
    "uploaded_by": 2,
    "latitude": -34.7749,
    "longitude": 138.5194,
    "uploaded_at": "2025-01-15T10:30:00.000Z",
    "url": "https://bucket.s3.ap-southeast-2.amazonaws.com/uploads/1705312200000-photo.jpg?X-Amz-Algorithm=..."
  }
]
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Failed to fetch media |

---

[← Back to API Index](./README.md) | [← Back to Documentation Index](../README.md)

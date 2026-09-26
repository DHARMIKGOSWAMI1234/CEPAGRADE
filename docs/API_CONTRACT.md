# ONIONVISION — REST API Contract

**Version:** 0.1.0 (Phase 01)  
**Base Path:** `/api`  
**OpenAPI Specification:** `/openapi.json`  
**Interactive Documentation:** `/docs`  

---

## 1. Health & System Status

### `GET /api/health`
Checks backend operational status and service identification.

- **Request:** None
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "onionvision-backend"
}
```

---

## 2. Inspections Management

### `POST /api/inspections`
Uploads an onion batch photograph and initiates a new inspection record in `pending` status.

- **Request Headers:** `Content-Type: multipart/form-data`
- **Request Body:**
  - `file`: Binary image file (Supported: JPEG, PNG, WEBP; max 15MB)
- **Response `201 Created`**:
```json
{
  "inspection_id": "INS-20260925-A1B2C3D4",
  "status": "pending",
  "message": "Image uploaded successfully",
  "created_at": "2026-09-25T18:30:00Z"
}
```
- **Error Responses:**
  - `400 Bad Request`: Empty file, corrupted image data, or unsupported MIME/extension.
  - `413 Content Too Large`: File exceeds 15MB limit.

---

### `GET /api/inspections`
Retrieves a paginated list of recent inspections ordered chronologically descending.

- **Query Parameters:**
  - `skip` *(optional, integer, default: 0)*: Pagination offset.
  - `limit` *(optional, integer, default: 50, max: 100)*: Maximum items to return.
- **Response `200 OK`**:
```json
[
  {
    "inspection_id": "INS-20260925-A1B2C3D4",
    "status": "pending",
    "created_at": "2026-09-25T18:30:00Z",
    "completed_at": null,
    "total_onions": null,
    "average_size_mm": null,
    "quality_score": null,
    "defect_rate": null
  }
]
```

---

### `GET /api/inspections/{inspection_id}`
Retrieves complete details for a single inspection, including aggregated metrics and detected onions.

- **Path Parameters:**
  - `inspection_id` *(required, string)*: Unique inspection ID (e.g. `INS-20260925-A1B2C3D4`).
- **Response `200 OK`**:
```json
{
  "inspection_id": "INS-20260925-A1B2C3D4",
  "status": "pending",
  "created_at": "2026-09-25T18:30:00Z",
  "completed_at": null,
  "total_onions": null,
  "average_size_mm": null,
  "quality_score": null,
  "defect_rate": null,
  "grade_distribution": null,
  "onions": []
}
```
*(Note: In Phase 01, AI-derived metrics are null because models are not trained yet.)*

- **Error Responses:**
  - `404 Not Found`: Inspection ID not found in database.

---

### `GET /api/inspections/{inspection_id}/results`
Retrieves the list of individual onion results associated with an inspection.

- **Path Parameters:**
  - `inspection_id` *(required, string)*
- **Response `200 OK`**:
```json
[]
```
*(When ML models are active in Phase 05, this returns an array of individual onion measurements and grades):*
```json
[
  {
    "id": 1,
    "onion_number": 1,
    "size_mm": 58.4,
    "quality_class": "healthy",
    "grade": "Grade A",
    "confidence": 0.94,
    "defect_area": 1.2,
    "created_at": "2026-09-25T18:35:00Z"
  }
]
```

- **Error Responses:**
  - `404 Not Found`: Inspection ID not found.

---

### `GET /api/inspections/{inspection_id}/report`
Retrieves inspection report status or document reference.

- **Path Parameters:**
  - `inspection_id` *(required, string)*
- **Response `200 OK`**:
```json
{
  "inspection_id": "INS-20260925-A1B2C3D4",
  "status": "not_implemented",
  "file_path": null,
  "created_at": null,
  "message": "PDF report generation engine is scheduled for implementation in Phase 07."
}
```
- **Error Responses:**
  - `404 Not Found`: Inspection ID not found.

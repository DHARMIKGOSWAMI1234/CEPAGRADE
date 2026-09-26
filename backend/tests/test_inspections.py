import io
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.models import Inspection


def test_database_initialization(db_session: Session):
    """Verify database tables and relationships are created properly."""
    inspection = Inspection(
        inspection_id="INS-TEST-001",
        image_path="/dummy/path/onion.jpg",
        status="pending",
    )
    db_session.add(inspection)
    db_session.commit()

    queried = db_session.query(Inspection).filter_by(inspection_id="INS-TEST-001").first()
    assert queried is not None
    assert queried.status == "pending"
    assert queried.created_at is not None


def test_valid_image_upload(client: TestClient, valid_jpeg_bytes: bytes):
    """Verify that uploading a valid JPEG returns 201 with a pending inspection record."""
    response = client.post(
        "/api/inspections",
        files={"file": ("sample_onion.jpg", valid_jpeg_bytes, "image/jpeg")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["inspection_id"].startswith("INS-")
    assert data["status"] == "pending"
    assert data["message"] == "Image uploaded successfully"


def test_valid_png_upload(client: TestClient, valid_png_bytes: bytes):
    """Verify that uploading a valid PNG returns 201."""
    response = client.post(
        "/api/inspections",
        files={"file": ("test_onion.png", valid_png_bytes, "image/png")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"


def test_invalid_image_corrupted_content(client: TestClient, fake_image_bytes: bytes):
    """Verify that corrupted content or disguised text files are rejected with 400."""
    response = client.post(
        "/api/inspections",
        files={"file": ("fake_image.jpg", fake_image_bytes, "image/jpeg")},
    )
    assert response.status_code == 400
    assert "Invalid or corrupted image file" in response.json()["detail"]


def test_unsupported_file_extension(client: TestClient, valid_jpeg_bytes: bytes):
    """Verify that unsupported extensions (.txt, .exe, etc.) are rejected with 400."""
    response = client.post(
        "/api/inspections",
        files={"file": ("malicious.exe", valid_jpeg_bytes, "image/jpeg")},
    )
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]


def test_empty_file_upload(client: TestClient):
    """Verify that uploading an empty 0-byte file is rejected with 400."""
    response = client.post(
        "/api/inspections",
        files={"file": ("empty.jpg", b"", "image/jpeg")},
    )
    assert response.status_code == 400
    assert "Uploaded file is empty" in response.json()["detail"]


def test_oversized_file_rejection(client: TestClient):
    """Verify that files exceeding the configured maximum size are rejected with 413."""
    oversized_bytes = b"0" * (settings.MAX_UPLOAD_SIZE_BYTES + 1024)
    response = client.post(
        "/api/inspections",
        files={"file": ("huge.jpg", oversized_bytes, "image/jpeg")},
    )
    assert response.status_code == 413
    assert "exceeds maximum permitted limit" in response.json()["detail"]


def test_path_traversal_protection(client: TestClient, valid_jpeg_bytes: bytes):
    """Verify that directory traversal attempts in filename are sanitized safely."""
    response = client.post(
        "/api/inspections",
        files={"file": ("../../../../etc/passwd.jpg", valid_jpeg_bytes, "image/jpeg")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"


def test_list_inspections(client: TestClient, valid_jpeg_bytes: bytes):
    """Verify listing recent inspections."""
    # Create two inspections
    client.post(
        "/api/inspections",
        files={"file": ("onion_1.jpg", valid_jpeg_bytes, "image/jpeg")},
    )
    client.post(
        "/api/inspections",
        files={"file": ("onion_2.jpg", valid_jpeg_bytes, "image/jpeg")},
    )

    response = client.get("/api/inspections")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    assert "inspection_id" in data[0]
    assert "status" in data[0]


def test_get_inspection_by_id(client: TestClient, valid_jpeg_bytes: bytes):
    """Verify retrieval of complete inspection details."""
    upload_resp = client.post(
        "/api/inspections",
        files={"file": ("onion_detail.jpg", valid_jpeg_bytes, "image/jpeg")},
    )
    inspection_id = upload_resp.json()["inspection_id"]

    response = client.get(f"/api/inspections/{inspection_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["inspection_id"] == inspection_id
    assert data["status"] == "pending"
    assert data["total_onions"] is None  # Nullable in Phase 01
    assert data["onions"] == []


def test_get_missing_inspection_returns_404(client: TestClient):
    """Verify querying non-existent inspection returns 404."""
    response = client.get("/api/inspections/INS-NONEXISTENT-999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_inspection_results(client: TestClient, valid_jpeg_bytes: bytes):
    """Verify retrieval of onion results for an existing inspection."""
    upload_resp = client.post(
        "/api/inspections",
        files={"file": ("results_test.jpg", valid_jpeg_bytes, "image/jpeg")},
    )
    inspection_id = upload_resp.json()["inspection_id"]

    response = client.get(f"/api/inspections/{inspection_id}/results")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_missing_inspection_results_returns_404(client: TestClient):
    """Verify querying onion results for non-existent inspection returns 404."""
    response = client.get("/api/inspections/INS-UNKNOWN-000/results")
    assert response.status_code == 404


def test_inspection_report_endpoint(client: TestClient, valid_jpeg_bytes: bytes):
    """Verify report status endpoint boundary."""
    upload_resp = client.post(
        "/api/inspections",
        files={"file": ("report_test.jpg", valid_jpeg_bytes, "image/jpeg")},
    )
    inspection_id = upload_resp.json()["inspection_id"]

    response = client.get(f"/api/inspections/{inspection_id}/report")
    assert response.status_code == 200
    data = response.json()
    assert data["inspection_id"] == inspection_id
    assert data["status"] == "not_implemented"
    assert "Phase 07" in data["message"]

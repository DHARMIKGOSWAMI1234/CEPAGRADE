from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.db.models import Inspection


def test_end_to_end_inspection_lifecycle_phase01(client: TestClient, db_session: Session, valid_jpeg_bytes: bytes):
    """
    Integration test covering:
    1. Upload valid image via POST /api/inspections.
    2. Confirm API responds with 201 Created and 'pending' status.
    3. Query database directly to confirm inspection record exists with status 'pending' and image saved.
    4. Query GET /api/inspections/{inspection_id} to verify complete response contract.
    5. Query GET /api/inspections/{inspection_id}/results to verify zero onions before AI runs.
    6. Verify ML fields remain unpopulated (None) to ensure no fake AI predictions are fabricated.
    """
    # 1. Upload image
    upload_response = client.post(
        "/api/inspections",
        files={"file": ("integration_onion.jpg", valid_jpeg_bytes, "image/jpeg")},
    )
    assert upload_response.status_code == 201
    upload_data = upload_response.json()
    inspection_id = upload_data["inspection_id"]
    assert inspection_id.startswith("INS-")
    assert upload_data["status"] == "pending"

    # 2. Verify database persistence
    db_record = db_session.query(Inspection).filter_by(inspection_id=inspection_id).first()
    assert db_record is not None
    assert db_record.status == "pending"
    assert "integration_onion.jpg" in db_record.image_path
    assert db_record.total_onions is None  # Must remain None in Phase 01

    # 3. Retrieve complete inspection
    detail_response = client.get(f"/api/inspections/{inspection_id}")
    assert detail_response.status_code == 200
    detail_data = detail_response.json()
    assert detail_data["inspection_id"] == inspection_id
    assert detail_data["status"] == "pending"
    assert detail_data["total_onions"] is None
    assert detail_data["quality_score"] is None
    assert detail_data["defect_rate"] is None
    assert detail_data["onions"] == []

    # 4. Retrieve results endpoint
    results_response = client.get(f"/api/inspections/{inspection_id}/results")
    assert results_response.status_code == 200
    results_data = results_response.json()
    assert results_data == []

    # 5. List inspections includes the newly created record
    list_response = client.get("/api/inspections")
    assert list_response.status_code == 200
    summaries = list_response.json()
    found = any(s["inspection_id"] == inspection_id for s in summaries)
    assert found is True

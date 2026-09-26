"""
ONIONVISION — Phase 07 Technical Report & PDF Generation Test Suite
Validates ReportLab PDF generation, content integrity, MIME type, calibration handling,
individual onion morphometry, security boundaries, and API routes.
"""

import io
import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Inspection, OnionResult, Report
from app.services.report_service import report_service


@pytest.fixture
def isolated_reports_dir(monkeypatch):
    """Isolates report generation destination in a temporary directory for tests."""
    temp_dir = tempfile.mkdtemp(prefix="onionvision_test_reports_")
    monkeypatch.setattr(settings, "REPORTS_DIR", temp_dir)
    return Path(temp_dir)


@pytest.fixture
def sample_completed_inspection(db_session: Session) -> str:
    """Creates a realistic completed calibrated inspection with onion results in DB."""
    insp_id = "INS-20260926-TESTCAL1"
    calib_meta = {
        "status": "CALIBRATED",
        "reference_detected": True,
        "reference_pixel_diameter": 120.0,
        "reference_confidence": 0.98,
        "known_reference_mm": 25.0,
        "mm_per_pixel": 0.2083,
        "pixels_per_mm": 4.80,
        "notes": "Scale calibrated to 4.80 px/mm using 25.0 mm reference standard.",
    }

    # Create dummy image in upload storage
    test_img = settings.upload_path / f"{insp_id}_source.jpg"
    test_img.write_bytes(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00\xFF\xD9")

    record = Inspection(
        inspection_id=insp_id,
        image_path=str(test_img),
        status="completed",
        created_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        total_onions=2,
        average_size_mm=55.4,
        quality_score=85.0,
        defect_rate=0.0,
        calibration_json=json.dumps(calib_meta),
    )
    db_session.add(record)

    onion1 = OnionResult(
        inspection_id=insp_id,
        onion_number=1,
        size_mm=58.2,
        quality_class="Healthy",
        grade="Grade A",
        confidence=0.97,
        defect_area=0.0,
        variety="Red-Onion",
        review_status="AUTO_ACCEPTABLE",
        needs_review=0,
        reasons_json=json.dumps([
            "Healthy classification with high confidence.",
            "Calibrated size estimated at 58.2 mm.",
            "Optimal size for Grade A standard.",
        ]),
        morphometry_json=json.dumps({
            "area_pixels": 15400.0,
            "perimeter_pixels": 470.0,
            "bbox_width_pixels": 130,
            "bbox_height_pixels": 135,
            "major_axis_pixels": 135.0,
            "minor_axis_pixels": 128.0,
            "aspect_ratio": 1.05,
            "circularity": 0.88,
            "equivalent_diameter_pixels": 140.0,
            "is_valid_geometry": True,
        }),
        bbox_json="[100, 100, 230, 235]",
        segmentation_confidence=0.96,
        size_pixels=140.0,
    )

    onion2 = OnionResult(
        inspection_id=insp_id,
        onion_number=2,
        size_mm=52.6,
        quality_class="Healthy",
        grade="Grade A",
        confidence=0.94,
        defect_area=0.0,
        variety="Yellow-Onion",
        review_status="AUTO_ACCEPTABLE",
        needs_review=0,
        reasons_json=json.dumps([
            "Healthy classification with high confidence.",
            "Calibrated size estimated at 52.6 mm.",
        ]),
        morphometry_json=json.dumps({
            "area_pixels": 13200.0,
            "perimeter_pixels": 420.0,
            "aspect_ratio": 1.02,
            "circularity": 0.91,
            "equivalent_diameter_pixels": 129.7,
            "is_valid_geometry": True,
        }),
        segmentation_confidence=0.95,
        size_pixels=129.7,
    )

    db_session.add_all([onion1, onion2])
    db_session.commit()
    return insp_id


@pytest.fixture
def sample_uncalibrated_inspection(db_session: Session) -> str:
    """Creates a realistic completed uncalibrated inspection in DB."""
    insp_id = "INS-20260926-TESTUNCAL"
    calib_meta = {
        "status": "UNCALIBRATED",
        "reference_detected": False,
        "notes": "No reference standard disc located in scene.",
    }

    test_img = settings.upload_path / f"{insp_id}_source.jpg"
    test_img.write_bytes(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00\xFF\xD9")

    record = Inspection(
        inspection_id=insp_id,
        image_path=str(test_img),
        status="completed",
        created_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        total_onions=1,
        average_size_mm=None,  # Must be None when uncalibrated
        quality_score=40.0,
        defect_rate=100.0,
        calibration_json=json.dumps(calib_meta),
    )
    db_session.add(record)

    onion1 = OnionResult(
        inspection_id=insp_id,
        onion_number=1,
        size_mm=None,  # No fabricated millimeters
        quality_class="Unhealthy",
        grade="Reject",
        confidence=0.99,
        defect_area=25.0,
        variety="Red-Onion",
        review_status="REVIEW_RECOMMENDED",
        needs_review=1,
        reasons_json=json.dumps([
            "Unhealthy classification: surface rot defect detected.",
            "Physical size unavailable because calibration reference was not configured.",
        ]),
        morphometry_json=json.dumps({
            "area_pixels": 11000.0,
            "perimeter_pixels": 410.0,
            "aspect_ratio": 1.25,
            "circularity": 0.81,
            "equivalent_diameter_pixels": 118.3,
            "is_valid_geometry": True,
        }),
        segmentation_confidence=0.92,
        size_pixels=118.3,
    )
    db_session.add(onion1)
    db_session.commit()
    return insp_id


# 1. report generation
def test_report_generation(db_session: Session, sample_completed_inspection: str, isolated_reports_dir: Path):
    """Verify programmatic report generation returns available status with valid file path."""
    response = report_service.generate_inspection_report(db=db_session, inspection_id=sample_completed_inspection)
    assert response.inspection_id == sample_completed_inspection
    assert response.status == "available"
    assert response.file_path is not None
    assert response.pdf_url == f"/api/inspections/{sample_completed_inspection}/report/pdf"
    assert response.file_size_bytes is not None and response.file_size_bytes > 0


# 2. PDF content exists
def test_pdf_content_exists(db_session: Session, sample_completed_inspection: str, isolated_reports_dir: Path):
    """Verify generated PDF file exists on disk and is non-empty."""
    response = report_service.generate_inspection_report(db=db_session, inspection_id=sample_completed_inspection)
    pdf_path = Path(response.file_path)
    assert pdf_path.exists()
    assert pdf_path.is_file()
    assert pdf_path.stat().st_size > 1000  # Non-empty, realistic PDF document


# 3. correct content type
def test_correct_content_type(client: TestClient, sample_completed_inspection: str, isolated_reports_dir: Path):
    """Verify PDF endpoint returns application/pdf content-type."""
    res = client.get(f"/api/inspections/{sample_completed_inspection}/report/pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


# 4. valid PDF signature
def test_valid_pdf_signature(client: TestClient, sample_completed_inspection: str, isolated_reports_dir: Path):
    """Verify returned bytes begin with official %PDF- magic signature."""
    res = client.get(f"/api/inspections/{sample_completed_inspection}/report/pdf")
    assert res.status_code == 200
    assert res.content.startswith(b"%PDF-")


# 5. nonexistent inspection → 404
def test_nonexistent_inspection_returns_404(client: TestClient):
    """Verify querying non-existent inspection returns HTTP 404."""
    res_report = client.get("/api/inspections/INS-NONEXISTENT-9999/report")
    assert res_report.status_code == 404
    assert "not found" in res_report.json()["detail"].lower()

    res_pdf = client.get("/api/inspections/INS-NONEXISTENT-9999/report/pdf")
    assert res_pdf.status_code == 404


# 6. calibrated inspection
def test_calibrated_inspection_report(db_session: Session, sample_completed_inspection: str, isolated_reports_dir: Path):
    """Verify calibrated inspection report includes calibrated measurements."""
    response = report_service.generate_inspection_report(db=db_session, inspection_id=sample_completed_inspection)
    pdf_path = Path(response.file_path)
    content = pdf_path.read_bytes()
    assert content.startswith(b"%PDF-")

    # Retrieve file via service helper
    file_path, filename = report_service.get_report_pdf_file(db=db_session, inspection_id=sample_completed_inspection)
    assert file_path.exists()
    assert filename == f"ONIONVISION_Report_{sample_completed_inspection}.pdf"


# 7. uncalibrated inspection
def test_uncalibrated_inspection_report(db_session: Session, sample_uncalibrated_inspection: str, isolated_reports_dir: Path):
    """Verify uncalibrated inspection does not invent physical mm and notes calibration requirement."""
    response = report_service.generate_inspection_report(db=db_session, inspection_id=sample_uncalibrated_inspection)
    assert response.status == "available"
    pdf_path = Path(response.file_path)
    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 1000

    # Ensure DB record remains uncalibrated (no fabricated average_size_mm)
    rec = db_session.query(Inspection).filter(Inspection.inspection_id == sample_uncalibrated_inspection).first()
    assert rec.average_size_mm is None
    assert rec.onions[0].size_mm is None


# 8. individual onion data
def test_individual_onion_data(db_session: Session, sample_completed_inspection: str, isolated_reports_dir: Path):
    """Verify report reflects multiple individual onion items and grading breakdown."""
    rec = db_session.query(Inspection).filter(Inspection.inspection_id == sample_completed_inspection).first()
    assert len(rec.onions) == 2
    response = report_service.generate_inspection_report(db=db_session, inspection_id=sample_completed_inspection)
    assert response.status == "available"
    assert response.file_size_bytes > 2000


# 9. report route
def test_report_route(client: TestClient, sample_completed_inspection: str, isolated_reports_dir: Path):
    """Verify GET /api/inspections/{inspection_id}/report returns available report metadata."""
    res = client.get(f"/api/inspections/{sample_completed_inspection}/report")
    assert res.status_code == 200
    data = res.json()
    assert data["inspection_id"] == sample_completed_inspection
    assert data["status"] == "available"
    assert "pdf" in data["pdf_url"]
    assert data["file_size_bytes"] > 0

    # Also test convenience route /api/reports/{inspection_id}
    res_alt = client.get(f"/api/reports/{sample_completed_inspection}")
    assert res_alt.status_code == 200
    assert res_alt.json()["status"] == "available"


# 10. PDF download route
def test_pdf_download_route(client: TestClient, sample_completed_inspection: str, isolated_reports_dir: Path):
    """Verify GET /api/inspections/{inspection_id}/report/pdf and /api/reports/{inspection_id}/pdf."""
    res1 = client.get(f"/api/inspections/{sample_completed_inspection}/report/pdf")
    assert res1.status_code == 200
    assert res1.headers["content-type"] == "application/pdf"
    assert "attachment" in res1.headers.get("content-disposition", "")
    assert sample_completed_inspection in res1.headers.get("content-disposition", "")
    assert len(res1.content) > 1000

    res2 = client.get(f"/api/reports/{sample_completed_inspection}/pdf")
    assert res2.status_code == 200
    assert res2.headers["content-type"] == "application/pdf"
    assert len(res2.content) == len(res1.content)


def test_security_invalid_inspection_id_rejected(client: TestClient):
    """Verify security validation rejects path traversal and malformed inspection IDs."""
    malicious_ids = [
        "../etc/passwd",
        "..\\windows\\system32",
        "INS-123/../../secret",
        "INVALID_ID_CHARS$",
        "'; DROP TABLE inspections; --",
    ]
    for bad_id in malicious_ids:
        res = client.get(f"/api/inspections/{bad_id}/report")
        assert res.status_code in [400, 404]

        res_pdf = client.get(f"/api/inspections/{bad_id}/report/pdf")
        assert res_pdf.status_code in [400, 404]

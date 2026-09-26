"""
ONIONVISION — Phase 04 Comprehensive Pipeline Test Suite
Tests every individual component of the CEPA-inspired CV pipeline:
Morphometry, Calibration, Extraction, Quality Classification, Confidence,
Review logic, Watershed Fallback, Grading, Batch Analytics, and DB Persistence.
"""

import math
from pathlib import Path
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.cv.morphometry import calculate_morphometry, compute_circularity, compute_equivalent_diameter
from app.cv.calibration import CalibrationEngine, CalibrationResult
from app.cv.extractor import OnionExtractor, OnionCrop
from app.cv.confidence import ConfidenceEngine, OnionConfidenceAssessment
from app.cv.watershed import WatershedSegmentationEngine
from app.cv.pipeline import RealCVPipeline, cv_pipeline
from app.db.models import Inspection, OnionResult

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
SEG_TEST_DIR = WORKSPACE_ROOT / "data" / "processed" / "segmentation" / "images" / "test"
CLS_TEST_DIR = WORKSPACE_ROOT / "data" / "processed" / "classification" / "test"


def test_morphometry_circularity_math():
    """Verify circularity calculation: 4 * pi * area / perimeter^2 and edge cases."""
    # Perfect circle radius 10: area = pi * 100, perimeter = 2 * pi * 10
    area = math.pi * 100.0
    perimeter = 2.0 * math.pi * 10.0
    circ = compute_circularity(area, perimeter)
    assert circ is not None
    assert pytest.approx(circ, 0.01) == 1.0

    # Non-circular ellipse
    circ_ellipse = compute_circularity(50.0, 40.0)
    assert circ_ellipse is not None
    assert 0.0 < circ_ellipse < 1.0

    # Edge cases: 0 or negative
    assert compute_circularity(0.0, 10.0) is None
    assert compute_circularity(10.0, 0.0) is None
    assert compute_circularity(-5.0, 10.0) is None


def test_morphometry_equivalent_diameter_math():
    """Verify equivalent diameter calculation: sqrt(4 * area / pi)."""
    area = math.pi * (25.0 ** 2)  # Radius 25 -> Diameter 50
    eq_diam = compute_equivalent_diameter(area)
    assert eq_diam is not None
    assert pytest.approx(eq_diam, 0.01) == 50.0

    assert compute_equivalent_diameter(0.0) is None
    assert compute_equivalent_diameter(-10.0) is None


def test_morphometry_on_contour():
    """Verify morphometry extraction on synthetic rectangular and circular contours."""
    # Synthetic 60x40 box contour
    box_cnt = np.array([[[10, 10]], [[70, 10]], [[70, 50]], [[10, 50]]], dtype=np.int32)
    morph = calculate_morphometry(contour=box_cnt)
    assert morph.is_valid_geometry is True
    assert morph.bbox_width_pixels in [60, 61]
    assert morph.bbox_height_pixels in [40, 41]
    assert morph.area_pixels == 2400.0
    assert morph.equivalent_diameter_pixels is not None
    assert morph.equivalent_diameter_pixels > 0


def test_calibration_with_known_constant():
    """Verify scale calibration math: mm_per_pixel = known_mm / ref_pixels."""
    engine = CalibrationEngine()
    ref_objects = [{"confidence": 0.90, "pixel_diameter": 100.0, "area_pixels": 7850.0}]

    calib = engine.calibrate(ref_objects, known_reference_diameter_mm=25.0)
    assert calib.status == "ESTIMATED"
    assert calib.reference_detected is True
    assert calib.pixels_per_mm == 4.0  # 100 px / 25 mm = 4 px/mm
    assert calib.mm_per_pixel == 0.25  # 25 mm / 100 px = 0.25 mm/px

    # Test conversion to mm
    assert calib.to_mm(200.0) == 50.0
    assert calib.to_mm(100.0) == 25.0


def test_calibration_missing_constant_reported():
    """Verify that when no physical reference dimension is configured, scale remains None."""
    engine = CalibrationEngine(default_reference_diameter_mm=None)
    ref_objects = [{"confidence": 0.88, "pixel_diameter": 95.0, "area_pixels": 7000.0}]

    calib = engine.calibrate(ref_objects, known_reference_diameter_mm=None)
    assert calib.status == "CALIBRATION_CONSTANT_REQUIRED"
    assert calib.reference_detected is True
    assert calib.mm_per_pixel is None
    assert calib.to_mm(100.0) is None
    assert "CALIBRATION_CONSTANT_REQUIRED" in calib.status


def test_calibration_no_reference_object():
    """Verify calibration status when no reference object is present."""
    engine = CalibrationEngine()
    calib = engine.calibrate(reference_objects=[], known_reference_diameter_mm=25.0)
    assert calib.status == "NO_REFERENCE_OBJECT_DETECTED"
    assert calib.reference_detected is False
    assert calib.to_mm(100.0) is None


def test_onion_crop_extraction():
    """Verify OnionExtractor creates valid rectangular and masked crops."""
    extractor = OnionExtractor(min_crop_dim=10, min_visible_pixels=50)
    # Create 200x200 canvas
    img = Image.new("RGB", (200, 200), color=(180, 40, 40))

    # Polygon inside crop
    poly = [[50.0, 50.0], [120.0, 50.0], [120.0, 120.0], [50.0, 120.0]]
    crop = extractor.extract_crop(
        full_image=img,
        instance_id=1,
        variety="Red-Onion",
        confidence=0.85,
        bbox=[45, 45, 125, 125],
        polygon=poly,
    )
    assert crop.is_valid is True
    assert crop.crop is not None
    assert crop.crop.size == (80, 80)
    assert crop.masked_crop is not None
    assert crop.visible_pixels > 0


def test_onion_crop_validation_rejection():
    """Verify invalid / minuscule crops are rejected cleanly."""
    extractor = OnionExtractor(min_crop_dim=15, min_visible_pixels=80)
    img = Image.new("RGB", (100, 100), color=(100, 100, 100))

    # Crop too small (5x5)
    tiny_crop = extractor.extract_crop(
        full_image=img,
        instance_id=1,
        variety="Red-Onion",
        confidence=0.80,
        bbox=[10, 10, 15, 15],
    )
    assert tiny_crop.is_valid is False
    assert "below minimum threshold" in tiny_crop.validation_error


def test_confidence_and_review_engine_states():
    """Verify deterministic assignment of review states."""
    conf_engine = ConfidenceEngine()

    # 1. AUTO_ACCEPTABLE
    auto = conf_engine.assess(
        segmentation_confidence=0.85,
        quality_confidence=0.92,
        is_valid_crop=True,
        calibration_status="ESTIMATED",
        aspect_ratio=1.1,
        circularity=0.85,
    )
    assert auto.review_status == "AUTO_ACCEPTABLE"

    # 2. REVIEW_RECOMMENDED due to uncalibrated scale or borderline confidence
    rec = conf_engine.assess(
        segmentation_confidence=0.55,
        quality_confidence=0.75,
        is_valid_crop=True,
        calibration_status="CALIBRATION_CONSTANT_REQUIRED",
    )
    assert rec.review_status == "REVIEW_RECOMMENDED"

    # 3. MANUAL_REVIEW_REQUIRED due to invalid crop or critically low confidence
    crit = conf_engine.assess(
        segmentation_confidence=0.30,
        quality_confidence=0.80,
        is_valid_crop=True,
        calibration_status="ESTIMATED",
    )
    assert crit.review_status == "MANUAL_REVIEW_REQUIRED"


def test_watershed_fallback_execution():
    """Verify classical OpenCV watershed segmentation fallback."""
    engine = WatershedSegmentationEngine(min_area_pixels=50)

    # Synthetic image with 2 solid circle objects
    img = Image.new("RGB", (300, 300), color=(220, 220, 220))
    import cv2
    np_img = np.array(img)
    cv2.circle(np_img, (80, 80), 40, (30, 30, 150), -1)
    cv2.circle(np_img, (200, 200), 45, (30, 30, 160), -1)

    result = engine.segment(np_img)
    assert result.status == "READY"
    assert len(result.instances) >= 2
    for inst in result.instances:
        assert inst.confidence > 0.0
        assert inst.pixel_diameter > 0


def test_real_cv_pipeline_end_to_end():
    """Verify complete RealCVPipeline on an audited test image."""
    test_images = list(SEG_TEST_DIR.glob("*.jpg"))
    assert len(test_images) > 0, "No segmentation test images found"

    pipeline = RealCVPipeline()
    assert pipeline.is_configured() is True

    result = pipeline.process(
        image_input=test_images[0],
        known_reference_diameter_mm=25.0,
    )
    assert result.status in ["completed", "review_required"]
    assert result.total_onions > 0
    assert result.calibration["status"] == "ESTIMATED"
    assert result.average_size_mm is not None
    assert 0.0 <= result.quality_score <= 100.0

    # Verify per-onion fields and source traceability
    first_onion = result.onions[0]
    assert first_onion.segmentation_source in ["yolov8n-seg", "watershed"]
    assert first_onion.quality_source == "mobilenetv3-small"
    assert first_onion.measurement_source == "mask_morphometry"
    assert first_onion.grading_source == "deterministic-rule-engine"
    assert first_onion.quality_class in ["Healthy", "Unhealthy"]
    assert first_onion.grade in ["Grade A", "Grade B", "Grade C", "Reject"]
    assert len(first_onion.reasons) > 0


def test_real_cv_pipeline_uncalibrated_scale():
    """Verify RealCVPipeline leaves physical mm as null when no reference constant is provided."""
    test_images = list(SEG_TEST_DIR.glob("*.jpg"))
    pipeline = RealCVPipeline()

    result = pipeline.process(
        image_input=test_images[0],
        known_reference_diameter_mm=None,  # Do not calibrate
    )
    assert result.calibration["status"] == "CALIBRATION_CONSTANT_REQUIRED"
    assert result.average_size_mm is None
    for onion in result.onions:
        assert onion.size_mm is None
        assert onion.size_pixels > 0


def test_api_execute_inspection_endpoint(client: TestClient, db_session: Session):
    """Verify POST /api/inspections/{id}/process executes pipeline and persists DB records."""
    test_images = list(SEG_TEST_DIR.glob("*.jpg"))
    real_image_bytes = test_images[0].read_bytes()

    # 1. Upload
    upload_resp = client.post(
        "/api/inspections",
        files={"file": ("real_test.jpg", real_image_bytes, "image/jpeg")},
    )
    assert upload_resp.status_code == 201
    inspection_id = upload_resp.json()["inspection_id"]
    assert upload_resp.json()["status"] == "pending"

    # 2. Trigger Process
    process_resp = client.post(
        f"/api/inspections/{inspection_id}/process?reference_diameter_mm=25.0"
    )
    assert process_resp.status_code == 200
    pdata = process_resp.json()
    assert pdata["inspection_id"] == inspection_id
    assert pdata["status"] in ["completed", "review_required"]
    assert pdata["total_onions"] > 0
    assert len(pdata["onions"]) == pdata["total_onions"]
    assert pdata["average_size_mm"] is not None

    # 3. Query DB directly to verify persistence
    queried = db_session.query(Inspection).filter_by(inspection_id=inspection_id).first()
    assert queried is not None
    assert queried.status in ["completed", "review_required"]
    assert queried.total_onions > 0
    assert len(queried.onions) > 0
    assert queried.completed_at is not None


def test_api_upload_with_auto_process(client: TestClient):
    """Verify POST /api/inspections?process=true performs immediate execution."""
    test_images = list(SEG_TEST_DIR.glob("*.jpg"))
    real_image_bytes = test_images[0].read_bytes()

    resp = client.post(
        "/api/inspections?process=true&reference_diameter_mm=25.0",
        files={"file": ("immediate.jpg", real_image_bytes, "image/jpeg")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] in ["completed", "review_required"]
    assert "successfully" in data["message"].lower()

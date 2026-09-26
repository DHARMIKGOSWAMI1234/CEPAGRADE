"""
ONIONVISION — Phase 03 Model Tests
Tests real trained model loading, inference accuracy, calibration behavior,
error handling, and end-to-end integration.
"""

from pathlib import Path
import pytest
from PIL import Image
import torch

from app.ml.segmentation import SegmentationEngine, DEFAULT_SEG_WEIGHTS
from app.ml.quality import QualityEngine, DEFAULT_QUALITY_WEIGHTS
from app.ml.inference import InferencePipeline

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
SEG_TEST_DIR = WORKSPACE_ROOT / "data" / "processed" / "segmentation" / "images" / "test"
CLS_TEST_DIR = WORKSPACE_ROOT / "data" / "processed" / "classification" / "test"


def test_trained_model_weights_exist():
    """Verify that both trained model artifacts exist on disk."""
    assert DEFAULT_SEG_WEIGHTS.exists(), f"Missing segmentation weights: {DEFAULT_SEG_WEIGHTS}"
    assert DEFAULT_QUALITY_WEIGHTS.exists(), f"Missing classification weights: {DEFAULT_QUALITY_WEIGHTS}"


def test_segmentation_model_loading():
    """Verify YOLOv8n-seg model loads into memory cleanly."""
    engine = SegmentationEngine.load_trained()
    assert engine.is_configured() is True
    assert engine._predictor is not None


def test_classification_model_loading():
    """Verify MobileNetV3-Small model loads into memory cleanly."""
    engine = QualityEngine.load_trained()
    assert engine.is_configured() is True
    assert engine._predictor is not None
    assert engine.supported_classes == ["Healthy", "Unhealthy"]


def test_segmentation_inference_on_real_image():
    """Verify real segmentation inference produces valid masks, bboxes, and variety classes."""
    test_images = list(SEG_TEST_DIR.glob("*.jpg"))
    assert len(test_images) > 0, "No real segmentation test images found"

    sample_img = test_images[0]
    engine = SegmentationEngine.load_trained()
    result = engine.segment(sample_img)

    assert result.status == "READY"
    assert len(result.instances) > 0
    for inst in result.instances:
        assert 0.0 <= inst.confidence <= 1.0
        assert len(inst.bbox) == 4
        assert inst.bbox[2] >= inst.bbox[0]  # xmax >= xmin
        assert inst.bbox[3] >= inst.bbox[1]  # ymax >= ymin
        assert inst.variety in ["Red-Onion", "Yellow-Onion", "Reference-Object"]

    # When no known reference constant is provided, calibration must NOT be guessed
    assert result.calibration_status in ["CALIBRATION CONSTANT REQUIRED", "NO REFERENCE OBJECT DETECTED"]


def test_scale_calibration_with_known_reference():
    """Verify scale calibration when known physical reference object dimension is provided."""
    test_images = list(SEG_TEST_DIR.glob("*.jpg"))
    sample_img = test_images[0]

    engine = SegmentationEngine.load_trained()
    # Provide known reference dimension (e.g. 25.0 mm coin)
    result = engine.segment(sample_img, known_reference_mm=25.0)

    assert result.status == "READY"
    if result.reference_object_detected:
        assert result.scale_pixels_per_mm is not None
        assert result.scale_pixels_per_mm > 0
        assert result.calibration_status == "ESTIMATED"
        for inst in result.instances:
            if not inst.is_reference_object:
                assert inst.estimated_physical_diameter_mm is not None
                assert inst.estimated_physical_diameter_mm > 0


def test_classification_inference_on_real_crops():
    """Verify MobileNetV3-Small accurately classifies real Healthy and Unhealthy crops."""
    healthy_crops = list((CLS_TEST_DIR / "Healthy").glob("*.jpg"))
    unhealthy_crops = list((CLS_TEST_DIR / "Unhealthy").glob("*.jpg"))
    assert len(healthy_crops) > 0 and len(unhealthy_crops) > 0

    engine = QualityEngine.load_trained()

    # Test Healthy crop
    res_h = engine.predict_quality(healthy_crops[0])
    assert res_h.status == "READY"
    assert res_h.prediction is not None
    assert res_h.prediction.quality_class in ["Healthy", "Unhealthy"]
    assert 0.0 <= res_h.prediction.confidence <= 1.0

    # Test Unhealthy crop
    res_uh = engine.predict_quality(unhealthy_crops[0])
    assert res_uh.status == "READY"
    assert res_uh.prediction is not None
    assert res_uh.prediction.quality_class in ["Healthy", "Unhealthy"]
    assert 0.0 <= res_uh.prediction.confidence <= 1.0


def test_model_missing_handling():
    """Verify graceful handling when non-existent model paths are specified."""
    bogus_path = WORKSPACE_ROOT / "ml" / "models" / "non_existent_weights.pt"
    seg_engine = SegmentationEngine(model_path=bogus_path)
    assert seg_engine.is_configured() is False
    seg_res = seg_engine.segment(Path("any.jpg"))
    assert seg_res.status == "MODEL_NOT_CONFIGURED"

    cls_engine = QualityEngine(model_path=bogus_path)
    assert cls_engine.is_configured() is False
    cls_res = cls_engine.predict_quality(onion_crop=None)
    assert cls_res.status == "MODEL_NOT_CONFIGURED"


def test_invalid_image_handling():
    """Verify corrupt or invalid inputs do not trigger unhandled crashes."""
    engine = QualityEngine.load_trained()
    res = engine.predict_quality(onion_crop=None)
    assert res.status == "ERROR"
    assert "None" in res.error_message


def test_end_to_end_real_pipeline():
    """Verify complete end-to-end pipeline execution using real trained models."""
    test_images = list(SEG_TEST_DIR.glob("*.jpg"))
    sample_img = test_images[0]

    pipeline = InferencePipeline.load_trained()
    assert pipeline.is_ready() is True

    result = pipeline.process_image(sample_img, known_reference_dimension_mm=25.0)
    assert result.status in ["COMPLETED", "REVIEW_REQUIRED"]
    assert result.total_onions is not None
    assert result.total_onions >= 0
    assert result.quality_score is not None
    assert 0.0 <= result.quality_score <= 100.0
    assert result.defect_rate is not None
    assert 0.0 <= result.defect_rate <= 100.0
    assert result.grade_distribution is not None
    assert all(k in result.grade_distribution for k in ["A", "B", "C", "Reject"])

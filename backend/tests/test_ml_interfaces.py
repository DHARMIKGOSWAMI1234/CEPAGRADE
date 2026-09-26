from pathlib import Path
from app.ml.segmentation import SegmentationEngine
from app.ml.quality import QualityEngine
from app.ml.inference import InferencePipeline


def test_segmentation_engine_unconfigured_state():
    """Verify SegmentationEngine gracefully reports MODEL_NOT_CONFIGURED in Phase 01."""
    engine = SegmentationEngine()
    assert engine.is_configured() is False

    result = engine.segment(Path("sample.jpg"))
    assert result.status == "MODEL_NOT_CONFIGURED"
    assert result.instances == []
    assert "Phase 03" in result.error_message


def test_quality_engine_unconfigured_state():
    """Verify QualityEngine gracefully reports MODEL_NOT_CONFIGURED in Phase 01."""
    engine = QualityEngine()
    assert engine.is_configured() is False

    result = engine.predict_quality(onion_crop=None)
    assert result.status == "MODEL_NOT_CONFIGURED"
    assert result.prediction is None
    assert "Phase 03" in result.error_message


def test_inference_pipeline_unconfigured_state():
    """Verify InferencePipeline refuses to fabricate results when models are unconfigured."""
    pipeline = InferencePipeline()
    assert pipeline.is_ready() is False

    result = pipeline.process_image(Path("sample.jpg"))
    assert result.status == "MODEL_NOT_CONFIGURED"
    assert result.total_onions is None
    assert "Phase 01 establishes backend architecture" in result.message

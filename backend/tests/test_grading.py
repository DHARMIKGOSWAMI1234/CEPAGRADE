from app.services.grading_service import (
    GradingConfig,
    GradingService,
    grading_service,
)


def test_grade_a_optimal_onion():
    """Verify optimal size and sound appearance achieves Grade A."""
    result = grading_service.grade_onion(
        size_mm=65.0,
        quality_class="healthy",
        defect_area=1.0,
        confidence=0.95,
    )
    assert result.grade == "Grade A"
    assert result.quality_score >= 85.0
    assert not result.needs_review
    assert any("Grade A range" in r for r in result.reasons)
    assert result.disclaimer != ""


def test_grade_b_minor_defect():
    """Verify minor defect and acceptable size yields Grade B."""
    result = grading_service.grade_onion(
        size_mm=45.0,
        quality_class="sound",
        defect_area=12.0,
        confidence=0.90,
    )
    assert result.grade == "Grade B"
    assert 65.0 <= result.quality_score < 85.0
    assert any("Grade B range" in r for r in result.reasons)


def test_grade_c_marginal_size():
    """Verify marginal size and moderate defect yields Grade C."""
    result = grading_service.grade_onion(
        size_mm=35.0,
        quality_class="acceptable",
        defect_area=25.0,
        confidence=0.85,
    )
    assert result.grade == "Grade C"
    assert 45.0 <= result.quality_score < 65.0


def test_reject_severe_defect():
    """Verify severe defect or rot class yields Reject."""
    result = grading_service.grade_onion(
        size_mm=55.0,
        quality_class="rot_defect",
        defect_area=50.0,
        confidence=0.92,
    )
    assert result.grade == "Reject"
    assert result.quality_score < 45.0
    assert any("defect" in r.lower() for r in result.reasons)


def test_low_confidence_triggers_review():
    """Verify low prediction confidence flags needs_review and adjusts score."""
    result = grading_service.grade_onion(
        size_mm=60.0,
        quality_class="sound",
        defect_area=2.0,
        confidence=0.45,  # Below default 0.65 threshold
    )
    assert result.needs_review is True
    assert any("Low prediction confidence" in r for r in result.reasons)


def test_missing_size_measurement_handled_gracefully():
    """Verify grading still operates explainably when physical size calibration is missing."""
    result = grading_service.grade_onion(
        size_mm=None,
        quality_class="sound",
        defect_area=2.0,
        confidence=0.88,
    )
    assert result.grade in ["Grade A", "Grade B", "Grade C", "Reject"]
    assert any("Physical size calibration not available" in r for r in result.reasons)


def test_custom_grading_config():
    """Verify that thresholds are fully configurable."""
    custom_config = GradingConfig(
        size_min_grade_a_mm=70.0,
        size_max_grade_a_mm=90.0,
        confidence_review_threshold=0.80,
    )
    custom_service = GradingService(config=custom_config)

    # 60mm was Grade A before, now below 70mm custom threshold
    result = custom_service.grade_onion(
        size_mm=60.0,
        quality_class="sound",
        confidence=0.75,  # Below 0.80 custom threshold
    )
    assert result.needs_review is True


def test_batch_grading_aggregation():
    """Verify deterministic aggregation across a multi-onion batch."""
    test_batch = [
        {"size_mm": 65.0, "quality_class": "healthy", "defect_area": 1.0, "confidence": 0.95},
        {"size_mm": 48.0, "quality_class": "sound", "defect_area": 10.0, "confidence": 0.90},
        {"size_mm": 35.0, "quality_class": "sound", "defect_area": 25.0, "confidence": 0.80},
        {"size_mm": 55.0, "quality_class": "rot", "defect_area": 60.0, "confidence": 0.95},
    ]
    summary = grading_service.grade_batch(test_batch)

    assert summary.total_onions == 4
    assert summary.average_size_mm is not None
    assert summary.grade_distribution["A"] == 1
    assert summary.grade_distribution["B"] == 1
    assert summary.grade_distribution["C"] == 1
    assert summary.grade_distribution["Reject"] == 1
    assert summary.defect_rate == 25.0  # 1 out of 4 is rejected

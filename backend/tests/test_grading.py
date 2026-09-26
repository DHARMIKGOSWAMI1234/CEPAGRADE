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


def test_grading_explainable_breakdown_structure():
    """Verify structured explainability breakdown is complete, populated, and mathematically consistent."""
    result = grading_service.grade_onion(
        size_mm=59.0,
        quality_class="Healthy",
        defect_area=0.0,
        confidence=0.98,
    )
    assert result.grade == "Grade A"
    assert result.quality_score == 100.0
    bd = result.breakdown
    assert "size" in bd and "health" in bd and "defects" in bd and "confidence" in bd and "final" in bd
    assert bd["size"]["value_mm"] == 59.0
    assert bd["size"]["score_impact"] == 0.0
    assert bd["health"]["classification"] == "Healthy"
    assert bd["health"]["is_defective"] is False
    assert bd["defects"]["defect_area_pct"] == 0.0
    assert bd["confidence"]["value"] == 0.98
    assert bd["confidence"]["needs_review"] is False
    assert bd["final"]["grade"] == "Grade A"
    assert bd["final"]["quality_score"] == 100.0


def test_size_threshold_boundaries():
    """Verify deterministic behavior at each exact physical size boundary."""
    # Grade A: [50.0, 85.0] mm
    res_at_50 = grading_service.grade_onion(size_mm=50.0, quality_class="sound", defect_area=6.0, confidence=0.90)
    res_sub_50 = grading_service.grade_onion(size_mm=49.9, quality_class="sound", defect_area=6.0, confidence=0.90)
    # At 50.0: score = 100 - 0 (size) - 15 (defect 6%) = 85.0 -> Grade A
    assert res_at_50.grade == "Grade A"
    assert res_at_50.quality_score == 85.0
    # At 49.9: score = 100 - 10 (size in B) - 15 (defect 6%) = 75.0 -> Grade B
    assert res_sub_50.grade == "Grade B"
    assert res_sub_50.quality_score == 75.0

    # Grade B upper: 95.0 mm vs 95.1 mm (with 0% defect)
    res_at_95 = grading_service.grade_onion(size_mm=95.0, quality_class="sound", defect_area=0.0, confidence=0.90)
    res_sup_95 = grading_service.grade_onion(size_mm=95.1, quality_class="sound", defect_area=0.0, confidence=0.90)
    # At 95.0: score = 100 - 10 = 90.0 (Grade A eligible if not defective)
    assert res_at_95.quality_score == 90.0
    # At 95.1: score = 100 - 25 = 75.0 -> Grade B
    assert res_sup_95.grade == "Grade B"
    assert res_sup_95.quality_score == 75.0

    # Grade C lower: 30.0 mm vs 29.9 mm
    res_at_30 = grading_service.grade_onion(size_mm=30.0, quality_class="sound", defect_area=0.0, confidence=0.90)
    res_sub_30 = grading_service.grade_onion(size_mm=29.9, quality_class="sound", defect_area=0.0, confidence=0.90)
    # At 30.0: score = 100 - 25 = 75.0 -> Grade B
    assert res_at_30.quality_score == 75.0
    # At 29.9: score = 100 - 45 = 55.0 -> Grade C
    assert res_sub_30.grade == "Grade C"
    assert res_sub_30.quality_score == 55.0


def test_defect_area_threshold_boundaries():
    """Verify deterministic transitions at defect percentage boundaries (5%, 20%, 40%)."""
    # 5.0% vs 5.1%
    res_at_5 = grading_service.grade_onion(size_mm=60.0, quality_class="sound", defect_area=5.0, confidence=0.90)
    res_sup_5 = grading_service.grade_onion(size_mm=60.0, quality_class="sound", defect_area=5.1, confidence=0.90)
    assert res_at_5.quality_score == 100.0  # 0% defect deduction
    assert res_sup_5.quality_score == 85.0  # -15.0 defect deduction

    # 20.0% vs 20.1%
    res_at_20 = grading_service.grade_onion(size_mm=60.0, quality_class="sound", defect_area=20.0, confidence=0.90)
    res_sup_20 = grading_service.grade_onion(size_mm=60.0, quality_class="sound", defect_area=20.1, confidence=0.90)
    assert res_at_20.quality_score == 85.0  # -15.0 defect deduction
    assert res_sup_20.quality_score == 70.0  # -30.0 defect deduction

    # 40.0% vs 40.1%
    res_at_40 = grading_service.grade_onion(size_mm=60.0, quality_class="sound", defect_area=40.0, confidence=0.90)
    res_sup_40 = grading_service.grade_onion(size_mm=60.0, quality_class="sound", defect_area=40.1, confidence=0.90)
    assert res_at_40.quality_score == 70.0  # -30.0 defect deduction
    assert res_sup_40.quality_score == 50.0  # -50.0 defect deduction


def test_confidence_review_threshold_boundary():
    """Verify confidence threshold at 0.65 exactly toggles review flag."""
    res_at_65 = grading_service.grade_onion(size_mm=60.0, quality_class="sound", confidence=0.65)
    res_sub_65 = grading_service.grade_onion(size_mm=60.0, quality_class="sound", confidence=0.64)
    assert res_at_65.needs_review is False
    assert res_at_65.quality_score == 100.0
    assert res_sub_65.needs_review is True
    assert res_sub_65.quality_score == 85.0  # -15.0 confidence deduction


def test_defective_onion_capping_and_reject():
    """Verify defective/unhealthy onions cannot achieve Grade A, and severe issues trigger Reject."""
    # Unhealthy with optimal size & 0 defect: score 100 - 40 = 60.0 -> Grade C
    res_unhealthy = grading_service.grade_onion(size_mm=60.0, quality_class="Unhealthy", defect_area=0.0, confidence=0.95)
    assert res_unhealthy.grade == "Grade C"
    assert res_unhealthy.quality_score == 60.0
    assert any("Visual quality issue detected" in r for r in res_unhealthy.reasons)

    # Unhealthy with severe defects -> Reject (< 45.0)
    res_reject = grading_service.grade_onion(size_mm=60.0, quality_class="Unhealthy", defect_area=25.0, confidence=0.95)
    # score = 100 - 40 (unhealthy) - 30 (defect > 20%) = 30.0 -> Reject
    assert res_reject.grade == "Reject"
    assert res_reject.quality_score == 30.0


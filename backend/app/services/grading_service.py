from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class GradingConfig:
    """
    Configurable parameters for the prototype onion grading engine.
    NOTE: These are technical prototype heuristics, NOT certified agricultural standards.
    """
    # Size thresholds (diameter in mm)
    size_min_grade_a_mm: float = 50.0
    size_max_grade_a_mm: float = 85.0
    size_min_grade_b_mm: float = 40.0
    size_max_grade_b_mm: float = 95.0
    size_min_grade_c_mm: float = 30.0
    size_max_grade_c_mm: float = 110.0

    # Defect area thresholds (% of total surface or mm² depending on calibration)
    defect_area_max_a: float = 5.0
    defect_area_max_b: float = 20.0
    defect_area_max_c: float = 40.0

    # Confidence threshold below which manual review is flagged
    confidence_review_threshold: float = 0.65

    disclaimer: str = (
        "Prototype grade based on configurable geometric and visual indicators. "
        "Not an official agricultural certification."
    )


@dataclass
class OnionGradeResult:
    """Individual onion grade decision and explainable justification."""
    grade: str  # "Grade A", "Grade B", "Grade C", "Reject"
    quality_score: float  # [0.0 - 100.0]
    reasons: List[str] = field(default_factory=list)
    needs_review: bool = False
    disclaimer: str = ""
    breakdown: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BatchGradingSummary:
    """Summary metrics across a batch of graded onions."""
    total_onions: int
    average_size_mm: Optional[float]
    overall_quality_score: float
    defect_rate: float
    grade_distribution: Dict[str, int]
    review_required_count: int
    disclaimer: str


class GradingService:
    """
    Deterministic, explainable grading engine for individual and batch onion evaluations.
    Combines size, visual quality class, defect area, and prediction confidence into
    a transparent quality score and prototype grade with reason codes.
    """

    def __init__(self, config: Optional[GradingConfig] = None):
        self.config = config or GradingConfig()

    def grade_onion(
        self,
        size_mm: Optional[float] = None,
        quality_class: Optional[str] = None,
        defect_area: Optional[float] = None,
        confidence: Optional[float] = None,
    ) -> OnionGradeResult:
        """
        Calculates an explainable grade and quality score for a single onion.
        All thresholds are configurable.
        """
        reasons: List[str] = []
        score: float = 100.0
        needs_review = False

        # 1. Prediction Confidence Evaluation
        conf_impact = 0.0
        conf_rule = f">= {self.config.confidence_review_threshold:.2f}"
        conf_result = "Acceptable prediction confidence."
        if confidence is not None:
            if confidence < self.config.confidence_review_threshold:
                needs_review = True
                conf_impact = -15.0
                conf_rule = f"< {self.config.confidence_review_threshold:.2f}"
                conf_result = f"Low prediction confidence ({confidence:.2f} < {self.config.confidence_review_threshold:.2f}); manual review recommended."
                reasons.append(conf_result)
                score += conf_impact
        else:
            conf_rule = "None provided"
            conf_result = "No prediction confidence score provided."
            reasons.append(conf_result)

        # 2. Defect / Quality Class Evaluation
        is_defective = False
        health_impact = 0.0
        health_result = "Quality class not specified."
        if quality_class:
            q_lower = quality_class.lower()
            if any(term in q_lower for term in ["bad", "defect", "rot", "damaged", "unhealthy", "reject"]):
                is_defective = True
                health_impact = -40.0
                score += health_impact
                health_result = f"Visual quality issue detected: '{quality_class}'."
                reasons.append(health_result)
            elif any(term in q_lower for term in ["good", "healthy", "sound", "fresh"]):
                health_result = f"Healthy visual appearance: '{quality_class}'."
                reasons.append(health_result)
            else:
                health_result = f"Quality class identified: '{quality_class}'."
                reasons.append(health_result)

        # 3. Defect Area Evaluation
        defect_impact = 0.0
        defect_rule = f"<= {self.config.defect_area_max_a:.1f}%"
        defect_result = "Negligible surface defect."
        if defect_area is not None:
            if defect_area > self.config.defect_area_max_c:
                defect_impact = -50.0
                defect_rule = f"> {self.config.defect_area_max_c:.1f}%"
                defect_result = f"Severe defect surface area ({defect_area:.1f}%)."
            elif defect_area > self.config.defect_area_max_b:
                defect_impact = -30.0
                defect_rule = f"> {self.config.defect_area_max_b:.1f}%"
                defect_result = f"Moderate defect surface area ({defect_area:.1f}%)."
            elif defect_area > self.config.defect_area_max_a:
                defect_impact = -15.0
                defect_rule = f"> {self.config.defect_area_max_a:.1f}%"
                defect_result = f"Minor visible surface markings ({defect_area:.1f}%)."
            else:
                defect_impact = 0.0
                defect_rule = f"<= {self.config.defect_area_max_a:.1f}%"
                defect_result = f"Negligible surface defect ({defect_area:.1f}%)."
            score += defect_impact
            reasons.append(defect_result)
        else:
            defect_rule = "None provided"
            defect_result = "Defect area not measured."

        # 4. Physical Size Evaluation (if calibrated size available)
        size_impact = 0.0
        size_rule = f"{self.config.size_min_grade_a_mm:.1f} - {self.config.size_max_grade_a_mm:.1f} mm"
        size_result = "Optimal diameter within Grade A range."
        if size_mm is not None:
            if self.config.size_min_grade_a_mm <= size_mm <= self.config.size_max_grade_a_mm:
                size_impact = 0.0
                size_rule = f"{self.config.size_min_grade_a_mm:.1f} <= size <= {self.config.size_max_grade_a_mm:.1f} mm"
                size_result = f"Optimal diameter ({size_mm:.1f} mm) within Grade A range."
                reasons.append(size_result)
            elif self.config.size_min_grade_b_mm <= size_mm <= self.config.size_max_grade_b_mm:
                size_impact = -10.0
                size_rule = f"{self.config.size_min_grade_b_mm:.1f} <= size <= {self.config.size_max_grade_b_mm:.1f} mm"
                size_result = f"Acceptable diameter ({size_mm:.1f} mm) within Grade B range."
                score += size_impact
                reasons.append(size_result)
            elif self.config.size_min_grade_c_mm <= size_mm <= self.config.size_max_grade_c_mm:
                size_impact = -25.0
                size_rule = f"{self.config.size_min_grade_c_mm:.1f} <= size <= {self.config.size_max_grade_c_mm:.1f} mm"
                size_result = f"Marginal diameter ({size_mm:.1f} mm) within Grade C range."
                score += size_impact
                reasons.append(size_result)
            else:
                size_impact = -45.0
                size_rule = f"size < {self.config.size_min_grade_c_mm:.1f} mm or size > {self.config.size_max_grade_c_mm:.1f} mm"
                size_result = f"Non-standard diameter ({size_mm:.1f} mm) outside typical sizing brackets."
                score += size_impact
                reasons.append(size_result)
        else:
            size_rule = "Uncalibrated"
            size_result = "Physical size calibration not available; grade estimated on visual quality alone."
            reasons.append(size_result)

        # Ensure score stays in bounds [0, 100]
        score = max(0.0, min(100.0, score))

        # 5. Deterministic Grade Mapping
        if score >= 85.0 and not is_defective:
            grade = "Grade A"
            grade_rule = "score >= 85.0 and not defective"
        elif score >= 65.0:
            grade = "Grade B"
            grade_rule = "65.0 <= score < 85.0 (or defective capped at Grade B)"
        elif score >= 45.0:
            grade = "Grade C"
            grade_rule = "45.0 <= score < 65.0"
        else:
            grade = "Reject"
            grade_rule = "score < 45.0"

        # 6. Structured Explainable Breakdown
        breakdown = {
            "size": {
                "value_mm": size_mm,
                "rule": size_rule,
                "result": size_result,
                "score_impact": size_impact,
            },
            "health": {
                "classification": quality_class,
                "confidence": confidence,
                "result": health_result,
                "score_impact": health_impact,
                "is_defective": is_defective,
            },
            "defects": {
                "defect_area_pct": defect_area,
                "rule": defect_rule,
                "result": defect_result,
                "score_impact": defect_impact,
            },
            "confidence": {
                "value": confidence,
                "rule": conf_rule,
                "result": conf_result,
                "score_impact": conf_impact,
                "needs_review": needs_review,
            },
            "final": {
                "quality_score": round(score, 1),
                "grade": grade,
                "rule": grade_rule,
            },
        }

        return OnionGradeResult(
            grade=grade,
            quality_score=round(score, 1),
            reasons=reasons,
            needs_review=needs_review,
            disclaimer=self.config.disclaimer,
            breakdown=breakdown,
        )

    def grade_batch(self, onions: List[Dict]) -> BatchGradingSummary:
        """
        Aggregates individual onion evaluations into batch analytics.
        `onions` is a list of dicts with keys: size_mm, quality_class, defect_area, confidence.
        """
        if not onions:
            return BatchGradingSummary(
                total_onions=0,
                average_size_mm=None,
                overall_quality_score=0.0,
                defect_rate=0.0,
                grade_distribution={"A": 0, "B": 0, "C": 0, "Reject": 0},
                review_required_count=0,
                disclaimer=self.config.disclaimer,
            )

        total = len(onions)
        scores: List[float] = []
        sizes: List[float] = []
        defective_count = 0
        review_count = 0
        distribution = {"A": 0, "B": 0, "C": 0, "Reject": 0}

        for item in onions:
            res = self.grade_onion(
                size_mm=item.get("size_mm"),
                quality_class=item.get("quality_class"),
                defect_area=item.get("defect_area"),
                confidence=item.get("confidence"),
            )
            scores.append(res.quality_score)
            if item.get("size_mm") is not None:
                sizes.append(item["size_mm"])
            if res.needs_review:
                review_count += 1

            if res.grade == "Grade A":
                distribution["A"] += 1
            elif res.grade == "Grade B":
                distribution["B"] += 1
            elif res.grade == "Grade C":
                distribution["C"] += 1
            else:
                distribution["Reject"] += 1
                defective_count += 1

        avg_size = round(sum(sizes) / len(sizes), 1) if sizes else None
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
        defect_rate = round((defective_count / total) * 100.0, 1)

        return BatchGradingSummary(
            total_onions=total,
            average_size_mm=avg_size,
            overall_quality_score=avg_score,
            defect_rate=defect_rate,
            grade_distribution=distribution,
            review_required_count=review_count,
            disclaimer=self.config.disclaimer,
        )


grading_service = GradingService()

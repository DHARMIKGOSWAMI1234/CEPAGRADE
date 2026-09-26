from dataclasses import dataclass, field
from typing import Dict, List, Optional


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
        if confidence is not None:
            if confidence < self.config.confidence_review_threshold:
                needs_review = True
                reasons.append(
                    f"Low prediction confidence ({confidence:.2f} < {self.config.confidence_review_threshold:.2f}); manual review recommended."
                )
                score -= 15.0
        else:
            reasons.append("No prediction confidence score provided.")

        # 2. Defect / Quality Class Evaluation
        is_defective = False
        if quality_class:
            q_lower = quality_class.lower()
            if any(term in q_lower for term in ["bad", "defect", "rot", "damaged", "unhealthy", "reject"]):
                is_defective = True
                score -= 40.0
                reasons.append(f"Visual quality issue detected: '{quality_class}'.")
            elif any(term in q_lower for term in ["good", "healthy", "sound", "fresh"]):
                reasons.append(f"Healthy visual appearance: '{quality_class}'.")
            else:
                reasons.append(f"Quality class identified: '{quality_class}'.")

        # 3. Defect Area Evaluation
        if defect_area is not None:
            if defect_area > self.config.defect_area_max_c:
                score -= 50.0
                reasons.append(f"Severe defect surface area ({defect_area:.1f}%).")
            elif defect_area > self.config.defect_area_max_b:
                score -= 30.0
                reasons.append(f"Moderate defect surface area ({defect_area:.1f}%).")
            elif defect_area > self.config.defect_area_max_a:
                score -= 15.0
                reasons.append(f"Minor visible surface markings ({defect_area:.1f}%).")
            else:
                reasons.append(f"Negligible surface defect ({defect_area:.1f}%).")

        # 4. Physical Size Evaluation (if calibrated size available)
        if size_mm is not None:
            if self.config.size_min_grade_a_mm <= size_mm <= self.config.size_max_grade_a_mm:
                reasons.append(f"Optimal diameter ({size_mm:.1f} mm) within Grade A range.")
            elif self.config.size_min_grade_b_mm <= size_mm <= self.config.size_max_grade_b_mm:
                score -= 10.0
                reasons.append(f"Acceptable diameter ({size_mm:.1f} mm) within Grade B range.")
            elif self.config.size_min_grade_c_mm <= size_mm <= self.config.size_max_grade_c_mm:
                score -= 25.0
                reasons.append(f"Marginal diameter ({size_mm:.1f} mm) within Grade C range.")
            else:
                score -= 45.0
                reasons.append(f"Non-standard diameter ({size_mm:.1f} mm) outside typical sizing brackets.")
        else:
            reasons.append("Physical size calibration not available; grade estimated on visual quality alone.")

        # Ensure score stays in bounds [0, 100]
        score = max(0.0, min(100.0, score))

        # 5. Deterministic Grade Mapping
        if score >= 85.0 and not is_defective:
            grade = "Grade A"
        elif score >= 65.0:
            grade = "Grade B"
        elif score >= 45.0:
            grade = "Grade C"
        else:
            grade = "Reject"

        return OnionGradeResult(
            grade=grade,
            quality_score=round(score, 1),
            reasons=reasons,
            needs_review=needs_review,
            disclaimer=self.config.disclaimer,
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

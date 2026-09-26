"""
ONIONVISION — Confidence & Review Engine
Evaluates multi-modal evidence across segmentation, quality classification,
morphometry, and calibration to assign deterministic, explainable review states.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class OnionConfidenceAssessment:
    """Confidence evaluation and review categorization for an individual onion."""
    overall_confidence: float
    review_status: str  # "AUTO_ACCEPTABLE", "REVIEW_RECOMMENDED", "MANUAL_REVIEW_REQUIRED"
    segmentation_confidence: float
    quality_confidence: float
    mask_valid: bool
    calibration_valid: bool
    reasons: List[str]

    def to_dict(self) -> Dict[str, Any]:
        """Returns JSON-serializable dictionary."""
        return {
            "overall_confidence": round(self.overall_confidence, 4),
            "review_status": self.review_status,
            "components": {
                "segmentation_confidence": round(self.segmentation_confidence, 4),
                "quality_confidence": round(self.quality_confidence, 4),
                "mask_valid": self.mask_valid,
                "calibration_valid": self.calibration_valid,
            },
            "reasons": self.reasons,
        }


class ConfidenceEngine:
    """
    Combines verified model outputs and CV heuristics to determine system review states:
    - AUTO_ACCEPTABLE: High confidence across segmentation and classification with sound geometry.
    - REVIEW_RECOMMENDED: Borderline confidence, missing scale calibration, or unusual geometry.
    - MANUAL_REVIEW_REQUIRED: Invalid mask, severely degraded confidence, or contradictory signals.
    """

    def __init__(
        self,
        min_seg_auto: float = 0.60,
        min_qual_auto: float = 0.70,
        min_seg_acceptable: float = 0.40,
        min_qual_acceptable: float = 0.55,
        max_aspect_ratio_auto: float = 1.80,
        min_circularity_auto: float = 0.50,
    ):
        self.min_seg_auto = min_seg_auto
        self.min_qual_auto = min_qual_auto
        self.min_seg_acceptable = min_seg_acceptable
        self.min_qual_acceptable = min_qual_acceptable
        self.max_aspect_ratio_auto = max_aspect_ratio_auto
        self.min_circularity_auto = min_circularity_auto

    def assess(
        self,
        segmentation_confidence: float,
        quality_confidence: float,
        is_valid_crop: bool,
        calibration_status: str,
        aspect_ratio: Optional[float] = None,
        circularity: Optional[float] = None,
        is_overlapping: bool = False,
    ) -> OnionConfidenceAssessment:
        """
        Performs deterministic rule-based review assessment.
        """
        reasons = []
        is_calibrated = calibration_status == "ESTIMATED"

        # Explicit weighted combined confidence score (40% segmentation, 60% quality classification)
        overall_conf = 0.40 * segmentation_confidence + 0.60 * quality_confidence

        # 1. Critical Failure Conditions -> MANUAL_REVIEW_REQUIRED
        if not is_valid_crop:
            reasons.append("Invalid or corrupted onion mask region.")
            return OnionConfidenceAssessment(
                overall_confidence=overall_conf,
                review_status="MANUAL_REVIEW_REQUIRED",
                segmentation_confidence=segmentation_confidence,
                quality_confidence=quality_confidence,
                mask_valid=False,
                calibration_valid=is_calibrated,
                reasons=reasons,
            )

        if segmentation_confidence < self.min_seg_acceptable:
            reasons.append(f"Segmentation confidence ({segmentation_confidence:.2f}) is critically low.")

        if quality_confidence < self.min_qual_acceptable:
            reasons.append(f"Quality classification confidence ({quality_confidence:.2f}) is critically low.")

        if reasons:
            return OnionConfidenceAssessment(
                overall_confidence=overall_conf,
                review_status="MANUAL_REVIEW_REQUIRED",
                segmentation_confidence=segmentation_confidence,
                quality_confidence=quality_confidence,
                mask_valid=True,
                calibration_valid=is_calibrated,
                reasons=reasons,
            )

        # 2. Advisory Conditions -> REVIEW_RECOMMENDED
        review_advisories = []
        if segmentation_confidence < self.min_seg_auto:
            review_advisories.append(f"Moderate segmentation confidence ({segmentation_confidence:.2f}).")

        if quality_confidence < self.min_qual_auto:
            review_advisories.append(f"Moderate quality classification confidence ({quality_confidence:.2f}).")

        if not is_calibrated:
            review_advisories.append("Physical millimeter scale uncalibrated.")

        if aspect_ratio is not None and aspect_ratio > self.max_aspect_ratio_auto:
            review_advisories.append(f"Elongated aspect ratio ({aspect_ratio:.2f}) suggests potential overlap or deformity.")

        if circularity is not None and circularity < self.min_circularity_auto:
            review_advisories.append(f"Irregular circularity ({circularity:.2f}).")

        if is_overlapping:
            review_advisories.append("Onion detected in dense or overlapping cluster.")

        if review_advisories:
            return OnionConfidenceAssessment(
                overall_confidence=overall_conf,
                review_status="REVIEW_RECOMMENDED",
                segmentation_confidence=segmentation_confidence,
                quality_confidence=quality_confidence,
                mask_valid=True,
                calibration_valid=is_calibrated,
                reasons=review_advisories,
            )

        # 3. Passed all gates -> AUTO_ACCEPTABLE
        reasons.append("High confidence segmentation and classification with consistent geometry.")
        return OnionConfidenceAssessment(
            overall_confidence=overall_conf,
            review_status="AUTO_ACCEPTABLE",
            segmentation_confidence=segmentation_confidence,
            quality_confidence=quality_confidence,
            mask_valid=True,
            calibration_valid=is_calibrated,
            reasons=reasons,
        )

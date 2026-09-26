#!/usr/bin/env python3
"""
ONIONVISION — End-to-End Real Inference Pipeline
Coordinates:
Image -> Segmentation -> Extraction -> Measurement -> Quality Classification -> Deterministic Grading
"""

import io
from pathlib import Path
from typing import Any, Dict, List, Optional
from PIL import Image

from .predict_segmentation import OnionSegmentationPredictor
from .predict_quality import OnionQualityPredictor

# Import grading service from backend
import sys
backend_path = Path(__file__).resolve().parent.parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.services.grading_service import grading_service, BatchGradingSummary, OnionGradeResult


class FullInferencePipeline:
    """
    Executes complete multi-stage computer vision inspection:
    1. Instance segmentation (isolating each onion and the reference object).
    2. Physical scale calibration using detected reference object.
    3. Individual onion cropping and health classification.
    4. Deterministic, explainable grading and batch statistics.
    """

    def __init__(
        self,
        seg_predictor: Optional[OnionSegmentationPredictor] = None,
        qual_predictor: Optional[OnionQualityPredictor] = None,
    ):
        self.seg = seg_predictor or OnionSegmentationPredictor()
        self.qual = qual_predictor or OnionQualityPredictor()
        self.grading = grading_service

    def is_configured(self) -> bool:
        """Pipeline is ready only if both trained model artifacts exist."""
        return self.seg.is_ready() and self.qual.is_ready()

    def process(self, image_path: Path) -> Dict[str, Any]:
        """Runs the entire inspection workflow on the provided image file."""
        if not self.is_configured():
            return {
                "status": "MODEL_NOT_CONFIGURED",
                "message": "One or more ML model weights are not configured.",
                "total_onions": None,
                "average_size_mm": None,
                "quality_score": None,
                "defect_rate": None,
                "grade_distribution": None,
                "onions": [],
            }

        # 1. Open image
        with Image.open(image_path) as img:
            full_img = img.convert("RGB")
            img_w, img_h = full_img.size

        # 2. Run Instance Segmentation
        seg_output = self.seg.predict(full_img)
        onions_raw = seg_output["onions"]
        ref_objects = seg_output["reference_objects"]
        scale_px_per_mm = seg_output["scale_pixels_per_mm"]

        if not onions_raw:
            return {
                "status": "completed",
                "total_onions": 0,
                "average_size_mm": None,
                "quality_score": 0.0,
                "defect_rate": 0.0,
                "grade_distribution": {"A": 0, "B": 0, "C": 0, "Reject": 0},
                "onions": [],
                "scale_calibrated": scale_px_per_mm is not None,
                "message": "No onions detected in the submitted image.",
            }

        graded_onions = []
        batch_inputs = []

        # 3. Process Each Detected Onion Instance
        for idx, item in enumerate(onions_raw):
            xmin, ymin, xmax, ymax = item["bbox_xyxy"]
            # Clamp bbox to image boundaries
            xmin = max(0, xmin)
            ymin = max(0, ymin)
            xmax = min(img_w, xmax)
            ymax = min(img_h, ymax)

            # Crop onion
            crop = full_img.crop((xmin, ymin, xmax, ymax))

            # 4. Predict Visual Health Quality
            qual_res = self.qual.predict_crop(crop)
            quality_class = qual_res["quality_class"]
            confidence = qual_res["confidence"]

            # 5. Calculate Physical or Pixel Dimensions
            px_diameter = item["pixel_diameter"]
            if scale_px_per_mm and scale_px_per_mm > 0:
                estimated_size_mm = round(px_diameter / scale_px_per_mm, 1)
            else:
                estimated_size_mm = None

            # Estimated defect surface area if unhealthy
            defect_area = 15.0 if quality_class == "Unhealthy" else 0.0

            # 6. Apply Deterministic Grading
            grade_result: OnionGradeResult = self.grading.grade_onion(
                size_mm=estimated_size_mm,
                quality_class=quality_class,
                defect_area=defect_area,
                confidence=confidence,
            )

            onion_record = {
                "id": idx + 1,
                "onion_number": idx + 1,
                "variety": item["class_name"],
                "size_mm": estimated_size_mm,
                "pixel_diameter": px_diameter,
                "quality_class": quality_class,
                "grade": grade_result.grade,
                "confidence": confidence,
                "defect_area": defect_area,
                "reasons": grade_result.reasons,
                "needs_review": grade_result.needs_review,
                "bbox": item["bbox_xyxy"],
            }
            graded_onions.append(onion_record)
            batch_inputs.append({
                "size_mm": estimated_size_mm,
                "quality_class": quality_class,
                "defect_area": defect_area,
                "confidence": confidence,
            })

        # 7. Aggregate Batch Statistics
        summary: BatchGradingSummary = self.grading.grade_batch(batch_inputs)

        status_result = "completed"
        if summary.review_required_count > (len(graded_onions) / 2):
            status_result = "review_required"

        return {
            "status": status_result,
            "total_onions": summary.total_onions,
            "average_size_mm": summary.average_size_mm,
            "quality_score": summary.overall_quality_score,
            "defect_rate": summary.defect_rate,
            "grade_distribution": summary.grade_distribution,
            "review_required_count": summary.review_required_count,
            "scale_calibrated": scale_px_per_mm is not None,
            "scale_pixels_per_mm": scale_px_per_mm,
            "onions": graded_onions,
        }

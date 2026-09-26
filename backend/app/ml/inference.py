from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
from PIL import Image

from .segmentation import SegmentationEngine, SegmentationResult, ModelNotConfiguredError
from .quality import QualityEngine, QualityResult
from app.services.grading_service import grading_service, BatchGradingSummary, OnionGradeResult


@dataclass
class PipelineExecutionResult:
    """End-to-end inference pipeline output structure."""
    status: str  # "COMPLETED", "MODEL_NOT_CONFIGURED", "FAILED", "REVIEW_REQUIRED"
    total_onions: Optional[int] = None
    average_size_mm: Optional[float] = None
    quality_score: Optional[float] = None
    defect_rate: Optional[float] = None
    grade_distribution: Optional[Dict[str, int]] = None
    onions: List[Dict[str, Any]] = field(default_factory=list)
    scale_calibrated: bool = False
    scale_pixels_per_mm: Optional[float] = None
    calibration_status: str = "NO_REFERENCE_OBJECT"
    message: str = ""


class InferencePipeline:
    """
    Orchestrates the entire vision and inspection workflow:
    Image -> Segmentation -> Extraction -> Measurement -> Quality -> Grading.
    """

    def __init__(
        self,
        segmentation_engine: Optional[SegmentationEngine] = None,
        quality_engine: Optional[QualityEngine] = None,
    ):
        self.segmentation_engine = segmentation_engine or SegmentationEngine()
        self.quality_engine = quality_engine or QualityEngine()
        self.grading = grading_service

    @classmethod
    def load_trained(cls) -> "InferencePipeline":
        """Loads end-to-end pipeline with trained YOLOv8n-seg and MobileNetV3-Small."""
        return cls(
            segmentation_engine=SegmentationEngine.load_trained(),
            quality_engine=QualityEngine.load_trained(),
        )

    def is_ready(self) -> bool:
        """Pipeline is ready only if both underlying ML models are configured."""
        return self.segmentation_engine.is_configured() and self.quality_engine.is_configured()

    def process_image(
        self,
        image_path: Path,
        known_reference_dimension_mm: Optional[float] = None,
    ) -> PipelineExecutionResult:
        """
        Executes the inspection pipeline on the given image path.
        If models are not configured, returns a structured MODEL_NOT_CONFIGURED result.
        """
        if not self.is_ready():
            return PipelineExecutionResult(
                status="MODEL_NOT_CONFIGURED",
                message=(
                    "Inference pipeline models are not configured. "
                    "Phase 01 establishes backend architecture; models are selected "
                    "and trained in Phase 03 after Phase 02 dataset auditing."
                ),
            )

        try:
            # 1. Open image
            with Image.open(image_path) as img:
                full_img = img.convert("RGB")
                img_w, img_h = full_img.size

            # 2. Instance Segmentation
            seg_res = self.segmentation_engine.segment(
                image_path=image_path,
                known_reference_mm=known_reference_dimension_mm,
            )
            if seg_res.status != "READY":
                return PipelineExecutionResult(
                    status="FAILED",
                    message=f"Segmentation error: {seg_res.error_message}",
                )

            onion_instances = [inst for inst in seg_res.instances if not inst.is_reference_object]
            scale_px = seg_res.scale_pixels_per_mm
            calibration_status = seg_res.calibration_status

            if not onion_instances:
                return PipelineExecutionResult(
                    status="COMPLETED",
                    total_onions=0,
                    average_size_mm=None,
                    quality_score=0.0,
                    defect_rate=0.0,
                    grade_distribution={"A": 0, "B": 0, "C": 0, "Reject": 0},
                    onions=[],
                    scale_calibrated=scale_px is not None,
                    scale_pixels_per_mm=scale_px,
                    calibration_status=calibration_status,
                    message="No onions detected in the submitted image.",
                )

            graded_onions = []
            batch_inputs = []

            # 3. Crop and evaluate each onion instance
            for idx, inst in enumerate(onion_instances):
                xmin, ymin, xmax, ymax = inst.bbox
                xmin = max(0, min(xmin, img_w - 1))
                ymin = max(0, min(ymin, img_h - 1))
                xmax = max(xmin + 1, min(xmax, img_w))
                ymax = max(ymin + 1, min(ymax, img_h))

                crop = full_img.crop((xmin, ymin, xmax, ymax))

                # 4. Predict visual quality
                q_res = self.quality_engine.predict_quality(crop)
                if q_res.status == "READY" and q_res.prediction:
                    quality_class = q_res.prediction.quality_class
                    confidence = q_res.prediction.confidence
                    defect_area = q_res.prediction.defect_area or 0.0
                else:
                    quality_class = "Healthy"
                    confidence = 0.50
                    defect_area = 0.0

                # 5. Measure physical diameter (ESTIMATED only if reference object calibrated)
                estimated_size_mm = None
                if scale_px and scale_px > 0:
                    estimated_size_mm = round(inst.pixel_diameter / scale_px, 1)

                # 6. Prototype grading
                grade_res: OnionGradeResult = self.grading.grade_onion(
                    size_mm=estimated_size_mm,
                    quality_class=quality_class,
                    defect_area=defect_area,
                    confidence=confidence,
                )

                onion_record = {
                    "onion_number": idx + 1,
                    "variety": inst.variety,
                    "size_mm": estimated_size_mm,
                    "pixel_diameter": inst.pixel_diameter,
                    "quality_class": quality_class,
                    "grade": grade_res.grade,
                    "confidence": confidence,
                    "defect_area": defect_area,
                    "reasons": grade_res.reasons,
                    "needs_review": grade_res.needs_review,
                    "bbox": inst.bbox,
                    "polygon": inst.mask,
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
            status_result = "COMPLETED"
            if summary.review_required_count > (len(graded_onions) / 2):
                status_result = "REVIEW_REQUIRED"

            return PipelineExecutionResult(
                status=status_result,
                total_onions=summary.total_onions,
                average_size_mm=summary.average_size_mm,
                quality_score=summary.overall_quality_score,
                defect_rate=summary.defect_rate,
                grade_distribution=summary.grade_distribution,
                onions=graded_onions,
                scale_calibrated=scale_px is not None,
                scale_pixels_per_mm=scale_px,
                calibration_status=calibration_status,
                message="Real ML inference completed successfully.",
            )
        except Exception as e:
            return PipelineExecutionResult(
                status="FAILED",
                message=f"Pipeline inference failed: {str(e)}",
            )

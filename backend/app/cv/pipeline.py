"""
ONIONVISION — End-to-End Real Computer Vision Pipeline
CEPA-Inspired Modular Architecture:
Image Quality Gate -> Segmentation (YOLO / Watershed Fallback) -> Extraction ->
Calibration -> Morphometry -> Quality Classification -> Confidence Review ->
Deterministic Grading -> Batch Analytics.
"""

from dataclasses import dataclass, field
from pathlib import Path
import time
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from PIL import Image

from app.core.config import settings
from app.ml.segmentation import SegmentationEngine, SegmentedInstance
from app.ml.quality import QualityEngine
from app.services.grading_service import grading_service, OnionGradeResult, BatchGradingSummary
from .morphometry import calculate_morphometry, OnionMorphometry
from .calibration import CalibrationEngine, CalibrationResult
from .extractor import OnionExtractor, OnionCrop
from .confidence import ConfidenceEngine, OnionConfidenceAssessment
from .watershed import WatershedSegmentationEngine
from .visualizer import render_segmentation_overlay


@dataclass
class ProcessedOnionInstance:
    """Complete evaluation record for an individual onion instance."""
    onion_number: int
    variety: str
    segmentation_confidence: float
    segmentation_source: str  # "yolov8n-seg" or "watershed"
    quality_class: str  # "Healthy" or "Unhealthy"
    quality_confidence: float
    quality_source: str  # "mobilenetv3-small"
    size_mm: Optional[float]  # None if scale uncalibrated
    size_pixels: float  # Equivalent diameter or max dimension
    measurement_source: str  # "mask_morphometry"
    grade: str  # "Grade A", "Grade B", "Grade C", "Reject"
    grading_source: str  # "deterministic-rule-engine"
    quality_score: float
    review_status: str  # "AUTO_ACCEPTABLE", "REVIEW_RECOMMENDED", "MANUAL_REVIEW_REQUIRED"
    needs_review: bool
    reasons: List[str]
    bbox: List[int]
    morphometry: Dict[str, Any]
    polygon: Optional[List[List[float]]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Returns JSON-serializable dictionary."""
        return {
            "onion_number": self.onion_number,
            "variety": self.variety,
            "segmentation_confidence": round(self.segmentation_confidence, 4),
            "segmentation_source": self.segmentation_source,
            "quality_class": self.quality_class,
            "quality_confidence": round(self.quality_confidence, 4),
            "quality_source": self.quality_source,
            "size_mm": self.size_mm,
            "size_pixels": round(self.size_pixels, 1),
            "measurement_source": self.measurement_source,
            "grade": self.grade,
            "grading_source": self.grading_source,
            "quality_score": round(self.quality_score, 1),
            "review_status": self.review_status,
            "needs_review": self.needs_review,
            "reasons": self.reasons,
            "bbox": self.bbox,
            "morphometry": self.morphometry,
            "polygon": self.polygon,
        }


@dataclass
class InspectionPipelineResult:
    """Comprehensive output of end-to-end computer vision inspection."""
    status: str  # "completed", "review_required", "failed", "no_onions_detected"
    total_onions: int
    healthy_count: int
    unhealthy_count: int
    healthy_percentage: float
    unhealthy_percentage: float
    average_size_mm: Optional[float]
    min_size_mm: Optional[float]
    max_size_mm: Optional[float]
    quality_score: float
    defect_rate: float
    grade_distribution: Dict[str, int]
    review_count: int
    calibration: Dict[str, Any]
    processing_time_ms: float
    timing_breakdown: Dict[str, float]
    onions: List[ProcessedOnionInstance]
    message: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Returns clean structured JSON response."""
        return {
            "status": self.status,
            "summary": {
                "total_onions": self.total_onions,
                "healthy_count": self.healthy_count,
                "unhealthy_count": self.unhealthy_count,
                "healthy_percentage": round(self.healthy_percentage, 1),
                "unhealthy_percentage": round(self.unhealthy_percentage, 1),
                "average_size_mm": self.average_size_mm,
                "min_size_mm": self.min_size_mm,
                "max_size_mm": self.max_size_mm,
                "quality_score": round(self.quality_score, 1),
                "defect_rate": round(self.defect_rate, 1),
                "grade_distribution": self.grade_distribution,
                "review_count": self.review_count,
            },
            "calibration": self.calibration,
            "performance": {
                "total_processing_time_ms": round(self.processing_time_ms, 2),
                "stage_timings_ms": {k: round(v, 2) for k, v in self.timing_breakdown.items()},
            },
            "onions": [o.to_dict() for o in self.onions],
            "message": self.message,
        }


class RealCVPipeline:
    """
    Main Computer Vision inspection coordinator implementing the CEPA-inspired architecture.
    """

    def __init__(
        self,
        seg_engine: Optional[SegmentationEngine] = None,
        qual_engine: Optional[QualityEngine] = None,
        watershed_engine: Optional[WatershedSegmentationEngine] = None,
        calibration_engine: Optional[CalibrationEngine] = None,
        confidence_engine: Optional[ConfidenceEngine] = None,
        extractor: Optional[OnionExtractor] = None,
    ):
        self.seg_engine = seg_engine or SegmentationEngine.load_trained()
        self.qual_engine = qual_engine or QualityEngine.load_trained()
        self.watershed_engine = watershed_engine or WatershedSegmentationEngine()
        self.calibration_engine = calibration_engine or CalibrationEngine()
        self.confidence_engine = confidence_engine or ConfidenceEngine()
        self.extractor = extractor or OnionExtractor()
        self.grading = grading_service

    def is_configured(self) -> bool:
        """Returns True if primary trained ML engines are configured."""
        return self.seg_engine.is_configured() and self.qual_engine.is_configured()

    def process(
        self,
        image_input: Any,
        known_reference_diameter_mm: Optional[float] = None,
        force_watershed: bool = False,
        output_dir: Optional[Path] = None,
        inspection_id: Optional[str] = None,
    ) -> InspectionPipelineResult:
        """
        Executes complete multi-stage computer vision inspection pipeline on real image.
        """
        t_pipeline_start = time.perf_counter()
        timings = {}

        # 1. Image Quality Gate
        t0 = time.perf_counter()
        if isinstance(image_input, (str, Path)):
            img_path = Path(image_input)
            if not img_path.exists():
                return self._create_error_result("Image file does not exist on disk.", 0.0)
            full_img = Image.open(str(img_path)).convert("RGB")
        elif isinstance(image_input, Image.Image):
            full_img = image_input.convert("RGB")
        else:
            return self._create_error_result("Unsupported input type for image.", 0.0)

        img_w, img_h = full_img.size
        if img_w < 50 or img_h < 50:
            return self._create_error_result("Image resolution too low for inspection.", 0.0)

        timings["image_gate"] = (time.perf_counter() - t0) * 1000

        # 2. Segmentation Engine (Primary YOLOv8n-seg, fallback Watershed)
        t0 = time.perf_counter()
        seg_source = "yolov8n-seg"
        seg_instances: List[SegmentedInstance] = []

        if not force_watershed and self.seg_engine.is_configured():
            try:
                seg_res = self.seg_engine.segment(full_img)
                if seg_res.status == "READY":
                    seg_instances = seg_res.instances
                    seg_source = "yolov8n-seg"
                else:
                    # Trigger classical watershed fallback
                    ws_res = self.watershed_engine.segment(full_img)
                    seg_instances = ws_res.instances
                    seg_source = "watershed"
            except Exception:
                ws_res = self.watershed_engine.segment(full_img)
                seg_instances = ws_res.instances
                seg_source = "watershed"
        else:
            ws_res = self.watershed_engine.segment(full_img)
            seg_instances = ws_res.instances
            seg_source = "watershed"

        timings["segmentation"] = (time.perf_counter() - t0) * 1000

        # 3. Separate Onion Instances vs Reference-Object
        onion_instances = [inst for inst in seg_instances if not inst.is_reference_object]
        reference_instances = [
            {
                "confidence": inst.confidence,
                "pixel_diameter": inst.pixel_diameter,
                "area_pixels": float(np.sum(inst.mask > 0)) if isinstance(inst.mask, np.ndarray) else inst.pixel_diameter ** 2 * 0.785,
            }
            for inst in seg_instances if inst.is_reference_object
        ]

        # 4. Calibration Engine
        t0 = time.perf_counter()
        calib_res: CalibrationResult = self.calibration_engine.calibrate(
            reference_objects=reference_instances,
            known_reference_diameter_mm=known_reference_diameter_mm,
        )
        timings["calibration"] = (time.perf_counter() - t0) * 1000

        if not onion_instances:
            total_duration = (time.perf_counter() - t_pipeline_start) * 1000
            return InspectionPipelineResult(
                status="no_onions_detected",
                total_onions=0,
                healthy_count=0,
                unhealthy_count=0,
                healthy_percentage=0.0,
                unhealthy_percentage=0.0,
                average_size_mm=None,
                min_size_mm=None,
                max_size_mm=None,
                quality_score=0.0,
                defect_rate=0.0,
                grade_distribution={"A": 0, "B": 0, "C": 0, "Reject": 0},
                review_count=0,
                calibration=calib_res.to_dict(),
                processing_time_ms=total_duration,
                timing_breakdown=timings,
                onions=[],
                message="No onion instances detected in the provided image.",
            )

        # 5. Process Individual Onion Instances
        processed_onions: List[ProcessedOnionInstance] = []
        batch_grading_inputs = []
        size_measurements_mm = []

        t_extract_total = 0.0
        t_morph_total = 0.0
        t_qual_total = 0.0
        t_conf_total = 0.0
        t_grade_total = 0.0

        for idx, inst in enumerate(onion_instances):
            # A. Extraction
            t0 = time.perf_counter()
            crop_result: OnionCrop = self.extractor.extract_crop(
                full_image=full_img,
                instance_id=idx + 1,
                variety=inst.variety,
                confidence=inst.confidence,
                bbox=inst.bbox,
                polygon=inst.contour or inst.mask if isinstance(inst.mask, list) else None,
            )
            t_extract_total += (time.perf_counter() - t0) * 1000

            # Save visual crops if destination directory is provided
            if output_dir and inspection_id:
                try:
                    output_dir.mkdir(parents=True, exist_ok=True)
                    if crop_result.crop is not None:
                        c_file = output_dir / f"{inspection_id}_onion_{idx + 1}_crop.jpg"
                        crop_result.crop.save(str(c_file), format="JPEG")
                    if crop_result.masked_crop is not None:
                        m_file = output_dir / f"{inspection_id}_onion_{idx + 1}_mask.png"
                        crop_result.masked_crop.save(str(m_file), format="PNG")
                except Exception:
                    pass

            # B. Morphometry
            t0 = time.perf_counter()
            morph: OnionMorphometry = calculate_morphometry(
                contour=crop_result.contour,
                mask=crop_result.mask,
                bbox=crop_result.bbox,
            )
            t_morph_total += (time.perf_counter() - t0) * 1000

            # C. Quality Classification via MobileNetV3-Small on Masked Crop
            t0 = time.perf_counter()
            qual_source = "mobilenetv3-small"
            if crop_result.is_valid and crop_result.masked_crop is not None and self.qual_engine.is_configured():
                q_res = self.qual_engine.predict_quality(crop_result.masked_crop)
                if q_res.status == "READY" and q_res.prediction is not None:
                    quality_class = q_res.prediction.quality_class
                    qual_confidence = q_res.prediction.confidence
                else:
                    quality_class = "Healthy"
                    qual_confidence = 0.50
            else:
                quality_class = "Healthy"
                qual_confidence = 0.50
            t_qual_total += (time.perf_counter() - t0) * 1000

            # D. Physical Size Calculation
            size_px = morph.equivalent_diameter_pixels or float(inst.pixel_diameter)
            size_mm = calib_res.to_mm(size_px)
            if size_mm is not None:
                size_measurements_mm.append(size_mm)

            # E. Confidence & Review Logic
            t0 = time.perf_counter()
            conf_assessment: OnionConfidenceAssessment = self.confidence_engine.assess(
                segmentation_confidence=inst.confidence,
                quality_confidence=qual_confidence,
                is_valid_crop=crop_result.is_valid,
                calibration_status=calib_res.status,
                aspect_ratio=morph.aspect_ratio,
                circularity=morph.circularity,
            )
            t_conf_total += (time.perf_counter() - t0) * 1000

            # F. Deterministic Explainable Grading
            t0 = time.perf_counter()
            defect_area = 15.0 if quality_class == "Unhealthy" else 0.0
            grade_res: OnionGradeResult = self.grading.grade_onion(
                size_mm=size_mm,
                quality_class=quality_class,
                defect_area=defect_area,
                confidence=conf_assessment.overall_confidence,
            )
            t_grade_total += (time.perf_counter() - t0) * 1000

            # Combine explainable reasons
            all_reasons = []
            all_reasons.extend(grade_res.reasons)
            if quality_class == "Healthy" and not any("Healthy" in r for r in all_reasons):
                all_reasons.append("Healthy classification with high confidence.")
            elif quality_class != "Healthy" and not any("Unhealthy" in r or "defect" in r.lower() for r in all_reasons):
                all_reasons.append("Grade reduced because health classification was Unhealthy.")

            for cr in conf_assessment.reasons:
                if cr not in all_reasons:
                    all_reasons.append(cr)

            needs_review = conf_assessment.review_status != "AUTO_ACCEPTABLE" or grade_res.needs_review

            morph_dict = morph.to_dict()
            morph_dict["grading_breakdown"] = grade_res.breakdown

            processed_onion = ProcessedOnionInstance(
                onion_number=idx + 1,
                variety=inst.variety,
                segmentation_confidence=inst.confidence,
                segmentation_source=seg_source,
                quality_class=quality_class,
                quality_confidence=qual_confidence,
                quality_source=qual_source,
                size_mm=size_mm,
                size_pixels=size_px,
                measurement_source="mask_morphometry",
                grade=grade_res.grade,
                grading_source="deterministic-rule-engine",
                quality_score=grade_res.quality_score,
                review_status=conf_assessment.review_status,
                needs_review=needs_review,
                reasons=all_reasons,
                bbox=inst.bbox,
                morphometry=morph_dict,
                polygon=crop_result.polygon,
            )
            processed_onions.append(processed_onion)

            batch_grading_inputs.append({
                "size_mm": size_mm,
                "quality_class": quality_class,
                "defect_area": defect_area,
                "confidence": conf_assessment.overall_confidence,
            })

        timings["extraction"] = t_extract_total
        timings["morphometry"] = t_morph_total
        timings["quality_classification"] = t_qual_total
        timings["confidence_review"] = t_conf_total
        timings["grading"] = t_grade_total

        # 6. Batch Aggregation
        summary: BatchGradingSummary = self.grading.grade_batch(batch_grading_inputs)

        healthy_count = sum(1 for o in processed_onions if o.quality_class == "Healthy")
        unhealthy_count = len(processed_onions) - healthy_count
        healthy_pct = (healthy_count / len(processed_onions)) * 100.0 if processed_onions else 0.0
        unhealthy_pct = 100.0 - healthy_pct

        avg_size = round(float(np.mean(size_measurements_mm)), 1) if size_measurements_mm else None
        min_size = round(float(np.min(size_measurements_mm)), 1) if size_measurements_mm else None
        max_size = round(float(np.max(size_measurements_mm)), 1) if size_measurements_mm else None

        review_count = sum(1 for o in processed_onions if o.needs_review)

        total_time_ms = (time.perf_counter() - t_pipeline_start) * 1000

        # Save annotated segmentation overlay image
        if output_dir and inspection_id:
            try:
                overlay_img = render_segmentation_overlay(
                    image=full_img,
                    processed_onions=processed_onions,
                    reference_objects=reference_instances,
                )
                overlay_file = output_dir / f"{inspection_id}_overlay.jpg"
                overlay_img.save(str(overlay_file), format="JPEG")
            except Exception:
                pass

        pipeline_status = "completed"
        if review_count > (len(processed_onions) / 2):
            pipeline_status = "review_required"

        return InspectionPipelineResult(
            status=pipeline_status,
            total_onions=len(processed_onions),
            healthy_count=healthy_count,
            unhealthy_count=unhealthy_count,
            healthy_percentage=healthy_pct,
            unhealthy_percentage=unhealthy_pct,
            average_size_mm=avg_size,
            min_size_mm=min_size,
            max_size_mm=max_size,
            quality_score=summary.overall_quality_score,
            defect_rate=summary.defect_rate,
            grade_distribution=summary.grade_distribution,
            review_count=review_count,
            calibration=calib_res.to_dict(),
            processing_time_ms=total_time_ms,
            timing_breakdown=timings,
            onions=processed_onions,
            message="Computer vision inspection completed successfully.",
        )

    def _create_error_result(self, message: str, elapsed_ms: float) -> InspectionPipelineResult:
        """Helper to create standardized error pipeline output."""
        return InspectionPipelineResult(
            status="failed",
            total_onions=0,
            healthy_count=0,
            unhealthy_count=0,
            healthy_percentage=0.0,
            unhealthy_percentage=0.0,
            average_size_mm=None,
            min_size_mm=None,
            max_size_mm=None,
            quality_score=0.0,
            defect_rate=0.0,
            grade_distribution={"A": 0, "B": 0, "C": 0, "Reject": 0},
            review_count=0,
            calibration={"status": "UNAVAILABLE", "notes": message},
            processing_time_ms=elapsed_ms,
            timing_breakdown={},
            onions=[],
            message=message,
        )


# Singleton pipeline instance for reuse across API calls
cv_pipeline = RealCVPipeline()

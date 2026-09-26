from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
import sys

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

DEFAULT_SEG_WEIGHTS = WORKSPACE_ROOT / "ml" / "models" / "onion_segmentation_yolov8n.pt"


class ModelNotConfiguredError(Exception):
    """Raised when an ML engine is invoked but no trained model weights are configured."""
    pass


@dataclass
class SegmentedInstance:
    """Represents a single segmented onion instance or reference object."""
    instance_id: int
    mask: Any  # Polygon coordinates or 2D binary mask
    bbox: List[int]  # [x_min, y_min, x_max, y_max]
    confidence: float
    contour: Optional[List[List[int]]] = None
    variety: str = "Unknown"
    pixel_diameter: float = 0.0
    estimated_physical_diameter_mm: Optional[float] = None
    is_reference_object: bool = False


@dataclass
class SegmentationResult:
    """Result of segmentation step."""
    status: str  # "READY", "MODEL_NOT_CONFIGURED", "ERROR"
    instances: List[SegmentedInstance]
    reference_object_detected: bool = False
    scale_pixels_per_mm: Optional[float] = None
    calibration_status: str = "NO_REFERENCE_OBJECT"
    error_message: Optional[str] = None


class BaseSegmentationEngine(ABC):
    """Abstract interface for onion segmentation models."""

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if model weights and dependencies are ready."""
        pass

    @abstractmethod
    def segment(self, image_path: Path, known_reference_mm: Optional[float] = None) -> SegmentationResult:
        """Run segmentation on an input image."""
        pass


class SegmentationEngine(BaseSegmentationEngine):
    """
    Onion Segmentation Engine adapter.
    Uses trained YOLOv8n-seg model for instance segmentation, mask generation,
    and reference-object scale detection.
    """

    def __init__(self, model_path: Optional[Path] = None, auto_load: bool = False):
        self.model_path = model_path
        self._predictor = None

        if auto_load and self.model_path is None and DEFAULT_SEG_WEIGHTS.exists():
            self.model_path = DEFAULT_SEG_WEIGHTS

        if self.model_path is not None and self.model_path.exists():
            try:
                from ml.inference.predict_segmentation import OnionSegmentationPredictor
                self._predictor = OnionSegmentationPredictor(model_path=self.model_path)
            except Exception:
                self._predictor = None

    @classmethod
    def load_trained(cls, model_path: Optional[Path] = None) -> "SegmentationEngine":
        """Factory method to load the trained YOLOv8n-seg model."""
        target_path = model_path or DEFAULT_SEG_WEIGHTS
        return cls(model_path=target_path, auto_load=True)

    def is_configured(self) -> bool:
        """Returns True only if a valid trained model weight file is found and loaded."""
        return self._predictor is not None and self.model_path is not None and self.model_path.exists()

    def segment(self, image_path: Path, known_reference_mm: Optional[float] = None) -> SegmentationResult:
        """
        Executes instance segmentation on the onion image.
        Returns real instances and reference scale calibration if configured.
        """
        if not self.is_configured():
            return SegmentationResult(
                status="MODEL_NOT_CONFIGURED",
                instances=[],
                error_message="Segmentation model not configured. Training scheduled for Phase 03.",
            )

        try:
            input_data = str(image_path) if isinstance(image_path, Path) else image_path
            raw_result = self._predictor.predict(
                image_input=input_data,
                known_reference_dimension_mm=known_reference_mm,
            )

            instances: List[SegmentedInstance] = []
            for item in raw_result["onions"]:
                instances.append(
                    SegmentedInstance(
                        instance_id=item["index"],
                        mask=item.get("polygon"),
                        bbox=item["bbox_xyxy"],
                        confidence=item["confidence"],
                        contour=item.get("polygon"),
                        variety=item["class_name"],
                        pixel_diameter=item["pixel_diameter"],
                        estimated_physical_diameter_mm=item.get("estimated_physical_diameter_mm"),
                        is_reference_object=False,
                    )
                )

            for ref in raw_result["reference_objects"]:
                instances.append(
                    SegmentedInstance(
                        instance_id=ref["index"],
                        mask=ref.get("polygon"),
                        bbox=ref["bbox_xyxy"],
                        confidence=ref["confidence"],
                        contour=ref.get("polygon"),
                        variety=ref["class_name"],
                        pixel_diameter=ref["pixel_diameter"],
                        estimated_physical_diameter_mm=None,
                        is_reference_object=True,
                    )
                )

            return SegmentationResult(
                status="READY",
                instances=instances,
                reference_object_detected=raw_result["reference_object_detected"],
                scale_pixels_per_mm=raw_result["scale_pixels_per_mm"],
                calibration_status=raw_result.get("calibration_status", "CALIBRATION CONSTANT REQUIRED"),
                error_message=None,
            )
        except Exception as e:
            return SegmentationResult(
                status="ERROR",
                instances=[],
                error_message=f"Segmentation failed: {str(e)}",
            )

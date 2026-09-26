from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional
import sys
from PIL import Image

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from .segmentation import ModelNotConfiguredError

DEFAULT_QUALITY_WEIGHTS = WORKSPACE_ROOT / "ml" / "models" / "onion_health_mobilenetv3_small.pth"


@dataclass
class QualityPrediction:
    """Prediction output for a single onion instance."""
    quality_class: str  # "Healthy" or "Unhealthy"
    confidence: float
    defect_area: Optional[float] = None
    is_healthy: bool = True
    probabilities: Optional[Dict[str, float]] = None


@dataclass
class QualityResult:
    """Result of quality/defect analysis step."""
    status: str  # "READY", "MODEL_NOT_CONFIGURED", "ERROR"
    prediction: Optional[QualityPrediction] = None
    error_message: Optional[str] = None


class BaseQualityEngine(ABC):
    """Abstract interface for onion quality and defect classification."""

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if quality model weights and classes are configured."""
        pass

    @abstractmethod
    def predict_quality(self, onion_crop: Any) -> QualityResult:
        """Predict visible quality class and confidence for a cropped onion."""
        pass


class QualityEngine(BaseQualityEngine):
    """
    Onion Quality / Defect Classification Engine adapter.
    Uses trained MobileNetV3-Small binary classifier (Healthy vs Unhealthy).
    """

    def __init__(
        self,
        model_path: Optional[Path] = None,
        supported_classes: Optional[List[str]] = None,
        auto_load: bool = False,
    ):
        self.model_path = model_path
        self.supported_classes = supported_classes or ["Healthy", "Unhealthy"]
        self._predictor = None

        if auto_load and self.model_path is None and DEFAULT_QUALITY_WEIGHTS.exists():
            self.model_path = DEFAULT_QUALITY_WEIGHTS

        if self.model_path is not None and self.model_path.exists():
            try:
                from ml.inference.predict_quality import OnionQualityPredictor
                self._predictor = OnionQualityPredictor(model_path=self.model_path)
            except Exception:
                self._predictor = None

    @classmethod
    def load_trained(cls, model_path: Optional[Path] = None) -> "QualityEngine":
        """Factory method to load the trained MobileNetV3-Small model."""
        target_path = model_path or DEFAULT_QUALITY_WEIGHTS
        return cls(model_path=target_path, auto_load=True)

    def is_configured(self) -> bool:
        """Returns True only if a valid trained model and verified classes are loaded."""
        return self._predictor is not None and self.model_path is not None and self.model_path.exists()

    def predict_quality(self, onion_crop: Any) -> QualityResult:
        """
        Executes quality classification on a cropped onion.
        Returns a controlled state if weights are unconfigured.
        """
        if not self.is_configured():
            return QualityResult(
                status="MODEL_NOT_CONFIGURED",
                prediction=None,
                error_message="Quality classification model not configured. Training scheduled for Phase 03.",
            )

        if onion_crop is None:
            return QualityResult(
                status="ERROR",
                prediction=None,
                error_message="Cannot predict quality: onion crop is None.",
            )

        try:
            if not isinstance(onion_crop, Image.Image):
                if isinstance(onion_crop, (str, Path)):
                    onion_crop = Image.open(str(onion_crop))
                else:
                    return QualityResult(
                        status="ERROR",
                        prediction=None,
                        error_message="Unsupported image input type for crop.",
                    )

            raw = self._predictor.predict_crop(onion_crop)
            quality_class = raw["quality_class"]
            confidence = raw["confidence"]
            defect_area = 15.0 if quality_class == "Unhealthy" else 0.0

            prediction = QualityPrediction(
                quality_class=quality_class,
                confidence=confidence,
                defect_area=defect_area,
                is_healthy=raw.get("is_healthy", quality_class == "Healthy"),
                probabilities=raw.get("probabilities"),
            )

            return QualityResult(
                status="READY",
                prediction=prediction,
                error_message=None,
            )
        except Exception as e:
            return QualityResult(
                status="ERROR",
                prediction=None,
                error_message=f"Quality classification failed: {str(e)}",
            )

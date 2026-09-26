"""
ONIONVISION — Calibration Engine
Performs physical millimeter scale calibration based on detected Reference-Object.
Strictly requires a verified reference dimension constant; never guesses scale.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import numpy as np


@dataclass
class CalibrationResult:
    """Result of reference object evaluation and physical scale calibration."""
    status: str  # "ESTIMATED", "CALIBRATION_CONSTANT_REQUIRED", "NO_REFERENCE_OBJECT_DETECTED", "UNAVAILABLE"
    reference_detected: bool
    reference_pixel_diameter: Optional[float] = None
    reference_confidence: Optional[float] = None
    known_reference_mm: Optional[float] = None
    mm_per_pixel: Optional[float] = None
    pixels_per_mm: Optional[float] = None
    notes: str = ""

    def to_mm(self, pixels: Optional[float]) -> Optional[float]:
        """
        Converts pixel dimension to physical millimeters using verified scale.
        Returns None if calibration is unavailable or pixels is None.
        """
        if pixels is None or self.mm_per_pixel is None or self.status != "ESTIMATED":
            return None
        return round(float(pixels * self.mm_per_pixel), 1)

    def to_dict(self) -> Dict[str, Any]:
        """Returns JSON-serializable dictionary."""
        return {
            "status": self.status,
            "reference_detected": self.reference_detected,
            "reference_pixel_diameter": round(self.reference_pixel_diameter, 1) if self.reference_pixel_diameter is not None else None,
            "reference_confidence": round(self.reference_confidence, 3) if self.reference_confidence is not None else None,
            "known_reference_mm": self.known_reference_mm,
            "mm_per_pixel": round(self.mm_per_pixel, 5) if self.mm_per_pixel is not None else None,
            "pixels_per_mm": round(self.pixels_per_mm, 3) if self.pixels_per_mm is not None else None,
            "notes": self.notes,
        }


class CalibrationEngine:
    """
    Evaluates reference objects and calculates physical conversion factor.
    """

    def __init__(self, default_reference_diameter_mm: Optional[float] = None):
        self.default_reference_diameter_mm = default_reference_diameter_mm

    def calibrate(
        self,
        reference_objects: List[Dict[str, Any]],
        known_reference_diameter_mm: Optional[float] = None,
        min_confidence: float = 0.35,
        min_pixel_area: float = 100.0,
    ) -> CalibrationResult:
        """
        Computes physical scale from detected Reference-Object instances.
        
        Rules:
        1. Reference-Object must be detected.
        2. Known physical reference dimension must be explicitly provided.
        3. Reference detection must satisfy confidence and area criteria.
        4. If physical dimension is omitted, returns CALIBRATION_CONSTANT_REQUIRED.
        """
        target_ref_mm = known_reference_diameter_mm or self.default_reference_diameter_mm

        if not reference_objects:
            return CalibrationResult(
                status="NO_REFERENCE_OBJECT_DETECTED",
                reference_detected=False,
                notes="No reference object marker detected in the scene.",
            )

        # Pick best reference object detection by confidence
        best_ref = max(reference_objects, key=lambda x: x.get("confidence", 0.0))
        ref_conf = float(best_ref.get("confidence", 0.0))
        ref_px = float(best_ref.get("pixel_diameter", 0.0))

        # Check geometry and area
        ref_area = float(best_ref.get("area_pixels", ref_px * ref_px * 0.785))
        if ref_conf < min_confidence or ref_area < min_pixel_area or ref_px <= 0:
            return CalibrationResult(
                status="UNAVAILABLE",
                reference_detected=True,
                reference_pixel_diameter=ref_px,
                reference_confidence=ref_conf,
                notes=f"Reference object detected but failed validation (conf: {ref_conf:.2f}, px: {ref_px:.1f}).",
            )

        # If reference object is valid but physical dimension is unconfigured:
        if target_ref_mm is None or target_ref_mm <= 0:
            return CalibrationResult(
                status="CALIBRATION_CONSTANT_REQUIRED",
                reference_detected=True,
                reference_pixel_diameter=ref_px,
                reference_confidence=ref_conf,
                known_reference_mm=None,
                notes="Reference object detected, but no verified physical reference dimension is configured. Set REFERENCE_OBJECT_DIAMETER_MM to enable mm conversion.",
            )

        # Valid calibration calculation:
        # mm_per_pixel = known_mm / ref_pixels
        # pixels_per_mm = ref_pixels / known_mm
        mm_per_pixel = target_ref_mm / ref_px
        pixels_per_mm = ref_px / target_ref_mm

        return CalibrationResult(
            status="ESTIMATED",
            reference_detected=True,
            reference_pixel_diameter=ref_px,
            reference_confidence=ref_conf,
            known_reference_mm=target_ref_mm,
            mm_per_pixel=mm_per_pixel,
            pixels_per_mm=pixels_per_mm,
            notes=f"Scale calibrated to {pixels_per_mm:.2f} px/mm using {target_ref_mm:.1f} mm reference standard.",
        )

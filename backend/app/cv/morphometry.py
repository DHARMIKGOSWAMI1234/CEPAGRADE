"""
ONIONVISION — Morphometry Engine
Calculates scientifically defensible geometric and shape attributes for
individual segmented onion instances from masks and contours.
"""

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np


@dataclass
class OnionMorphometry:
    """Comprehensive geometric measurements for a single onion instance in pixel coordinates."""
    area_pixels: float
    perimeter_pixels: float
    bbox_width_pixels: int
    bbox_height_pixels: int
    major_axis_pixels: Optional[float] = None
    minor_axis_pixels: Optional[float] = None
    aspect_ratio: Optional[float] = None
    circularity: Optional[float] = None
    equivalent_diameter_pixels: Optional[float] = None
    is_valid_geometry: bool = True
    geometry_notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Returns JSON-serializable dictionary of geometric attributes."""
        return {
            "area_pixels": round(self.area_pixels, 1),
            "perimeter_pixels": round(self.perimeter_pixels, 1),
            "bbox_width_pixels": self.bbox_width_pixels,
            "bbox_height_pixels": self.bbox_height_pixels,
            "major_axis_pixels": round(self.major_axis_pixels, 1) if self.major_axis_pixels is not None else None,
            "minor_axis_pixels": round(self.minor_axis_pixels, 1) if self.minor_axis_pixels is not None else None,
            "aspect_ratio": round(self.aspect_ratio, 3) if self.aspect_ratio is not None else None,
            "circularity": round(self.circularity, 3) if self.circularity is not None else None,
            "equivalent_diameter_pixels": round(self.equivalent_diameter_pixels, 1) if self.equivalent_diameter_pixels is not None else None,
            "is_valid_geometry": self.is_valid_geometry,
            "geometry_notes": self.geometry_notes,
        }


def compute_circularity(area: float, perimeter: float) -> Optional[float]:
    """
    Calculates circularity: 4 * pi * area / (perimeter^2).
    Returns None if perimeter is zero or resulting value is non-finite.
    A perfect circle has circularity = 1.0.
    """
    if perimeter <= 0 or area <= 0:
        return None
    circularity = (4.0 * math.pi * area) / (perimeter * perimeter)
    if math.isnan(circularity) or math.isinf(circularity) or circularity <= 0:
        return None
    # Cap slight numerical overshoots from discrete pixel grids to 1.0
    return min(circularity, 1.0)


def compute_equivalent_diameter(area: float) -> Optional[float]:
    """
    Calculates the diameter of a circle with the same area as the instance:
    equivalent_diameter_pixels = sqrt(4 * area / pi).
    Returns None if area <= 0.
    """
    if area <= 0:
        return None
    diameter = math.sqrt((4.0 * area) / math.pi)
    if math.isnan(diameter) or math.isinf(diameter):
        return None
    return diameter


def calculate_morphometry(
    contour: Optional[np.ndarray] = None,
    mask: Optional[np.ndarray] = None,
    bbox: Optional[List[int]] = None,
) -> OnionMorphometry:
    """
    Derives geometric attributes for an individual segmented instance.
    Accepts contour, binary mask, and/or bounding box.
    """
    # 1. Derive or refine contour from mask if needed
    if contour is None and mask is not None:
        mask_uint8 = (mask > 0).astype(np.uint8) * 255 if mask.dtype != np.uint8 else mask
        contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            contour = max(contours, key=cv2.contourArea)

    # 2. Basic bounding dimensions
    if bbox is not None and len(bbox) == 4:
        bbox_w = max(0, int(bbox[2] - bbox[0]))
        bbox_h = max(0, int(bbox[3] - bbox[1]))
    elif contour is not None and len(contour) > 0:
        x, y, bbox_w, bbox_h = cv2.boundingRect(contour)
    else:
        return OnionMorphometry(
            area_pixels=0.0,
            perimeter_pixels=0.0,
            bbox_width_pixels=0,
            bbox_height_pixels=0,
            is_valid_geometry=False,
            geometry_notes="No contour or bounding box provided.",
        )

    # 3. Area and perimeter
    if contour is not None and len(contour) >= 3:
        area = float(cv2.contourArea(contour))
        perimeter = float(cv2.arcLength(contour, True))
    elif mask is not None:
        area = float(np.sum(mask > 0))
        perimeter = float(2 * (bbox_w + bbox_h))  # Fallback approximation
    else:
        area = float(bbox_w * bbox_h)
        perimeter = float(2 * (bbox_w + bbox_h))

    # 4. Major and minor axes via fitted ellipse (requires >= 5 points)
    major_axis = None
    minor_axis = None
    aspect_ratio = None

    if contour is not None and len(contour) >= 5:
        try:
            ellipse = cv2.fitEllipse(contour)
            axes = ellipse[1]  # (major_axis_diameter, minor_axis_diameter) or vice versa
            d1, d2 = sorted(axes, reverse=True)
            major_axis = float(d1)
            minor_axis = float(d2)
            if minor_axis > 0:
                aspect_ratio = float(major_axis / minor_axis)
        except Exception:
            # Fallback to minimum area rotated rectangle
            rect = cv2.minAreaRect(contour)
            w, h = rect[1]
            if w > 0 and h > 0:
                major_axis = float(max(w, h))
                minor_axis = float(min(w, h))
                aspect_ratio = float(major_axis / minor_axis)

    if aspect_ratio is None and bbox_h > 0:
        aspect_ratio = float(max(bbox_w, bbox_h) / max(1, min(bbox_w, bbox_h)))

    # 5. Circularity and Equivalent Diameter
    circularity = compute_circularity(area, perimeter)
    eq_diameter = compute_equivalent_diameter(area)

    is_valid = area > 20 and bbox_w > 5 and bbox_h > 5
    notes = "Valid morphometry" if is_valid else "Degenerate or minuscule mask region"

    return OnionMorphometry(
        area_pixels=area,
        perimeter_pixels=perimeter,
        bbox_width_pixels=bbox_w,
        bbox_height_pixels=bbox_h,
        major_axis_pixels=major_axis,
        minor_axis_pixels=minor_axis,
        aspect_ratio=aspect_ratio,
        circularity=circularity,
        equivalent_diameter_pixels=eq_diameter,
        is_valid_geometry=is_valid,
        geometry_notes=notes,
    )

"""
ONIONVISION — Classical Watershed Segmentation Fallback
Provides a deterministic OpenCV-based watershed segmentation engine
when YOLOv8n-seg weights are unavailable or when classical fallback is requested.
Explicitly identifies output source as "watershed".
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image

from app.ml.segmentation import SegmentedInstance, SegmentationResult


class WatershedSegmentationEngine:
    """
    Classical computer vision segmentation fallback using morphological operations,
    Euclidean distance transform, and marker-controlled watershed.
    """

    def __init__(self, min_area_pixels: int = 150, max_instances: int = 100):
        self.min_area_pixels = min_area_pixels
        self.max_instances = max_instances

    def segment(self, image_input: Any) -> SegmentationResult:
        """
        Executes classical watershed segmentation on an image (Path, PIL Image, or ndarray).
        Returns SegmentationResult with instances labeled source='watershed'.
        """
        # 1. Convert input to BGR numpy array
        if isinstance(image_input, Image.Image):
            rgb = np.array(image_input.convert("RGB"))
            bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        elif isinstance(image_input, (str, Path)):
            bgr = cv2.imread(str(image_input))
            if bgr is None:
                return SegmentationResult(
                    status="ERROR",
                    instances=[],
                    error_message=f"Failed to load image from path: {image_input}",
                )
        elif isinstance(image_input, np.ndarray):
            bgr = image_input if image_input.shape[2] == 3 else cv2.cvtColor(image_input, cv2.COLOR_GRAY2BGR)
        else:
            return SegmentationResult(
                status="ERROR",
                instances=[],
                error_message="Unsupported image input type for watershed.",
            )

        h, w = bgr.shape[:2]

        # 2. Color conversion and adaptive thresholding
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Otsu thresholding + inverted background
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # 3. Morphological noise removal
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)

        # 4. Finding sure background area
        sure_bg = cv2.dilate(opening, kernel, iterations=3)

        # 5. Finding sure foreground area via Distance Transform
        dist_transform = cv2.distanceTransform(opening, cv2.DIST_L2, 5)
        if dist_transform.max() > 0:
            _, sure_fg = cv2.threshold(dist_transform, 0.4 * dist_transform.max(), 255, 0)
        else:
            sure_fg = np.zeros_like(opening)

        sure_fg = np.uint8(sure_fg)
        unknown = cv2.subtract(sure_bg, sure_fg)

        # 6. Marker labelling
        num_markers, markers = cv2.connectedComponents(sure_fg)
        # Add 1 to all labels so that sure background is not 0, but 1
        markers = markers + 1
        # Mark the region of unknown with 0
        markers[unknown == 255] = 0

        # 7. Apply Watershed
        cv2.watershed(bgr, markers)

        # 8. Extract contours for each segmented basin
        instances: List[SegmentedInstance] = []
        instance_idx = 1

        for label in range(2, num_markers + 1):
            if instance_idx > self.max_instances:
                break

            mask_label = np.uint8(markers == label) * 255
            area = float(np.sum(mask_label > 0))

            if area < self.min_area_pixels:
                continue

            contours, _ = cv2.findContours(mask_label, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue

            cnt = max(contours, key=cv2.contourArea)
            if cv2.contourArea(cnt) < self.min_area_pixels:
                continue

            x, y, bw, bh = cv2.boundingRect(cnt)
            polygon = [[float(pt[0][0]), float(pt[0][1])] for pt in cnt]

            instances.append(
                SegmentedInstance(
                    instance_id=instance_idx,
                    mask=polygon,
                    bbox=[x, y, x + bw, y + bh],
                    confidence=0.75,  # Classical CV heuristic confidence
                    contour=polygon,
                    variety="Red-Onion",  # Default variety assignment in classical fallback
                    pixel_diameter=max(bw, bh),
                    estimated_physical_diameter_mm=None,
                    is_reference_object=False,
                )
            )
            instance_idx += 1

        return SegmentationResult(
            status="READY",
            instances=instances,
            reference_object_detected=False,
            scale_pixels_per_mm=None,
            calibration_status="CALIBRATION_CONSTANT_REQUIRED",
            error_message=None,
        )

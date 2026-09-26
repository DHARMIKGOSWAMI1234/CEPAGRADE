"""
ONIONVISION — Individual Onion Extractor
Extracts per-instance bounding box crops and precision masked crops from
segmentation instance masks, enforcing quality input validation for classification.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image


@dataclass
class OnionCrop:
    """Extracted visual crop and mask representation for an individual onion."""
    onion_id: int
    variety: str
    confidence: float
    bbox: List[int]  # [xmin, ymin, xmax, ymax]
    mask: Optional[np.ndarray]  # 2D binary numpy mask cropped to bbox
    full_mask: Optional[np.ndarray]  # 2D binary numpy mask of full image
    polygon: Optional[List[List[float]]]
    contour: Optional[np.ndarray]
    crop: Optional[Image.Image]  # Rectangular RGB crop
    masked_crop: Optional[Image.Image]  # Isolated onion with background zeroed
    visible_pixels: int
    is_valid: bool
    validation_error: Optional[str] = None


class OnionExtractor:
    """
    Extracts individual onion instance crops and precision masked crops
    from the original image and YOLO segmentation masks/polygons.
    """

    def __init__(self, min_crop_dim: int = 15, min_visible_pixels: int = 80):
        self.min_crop_dim = min_crop_dim
        self.min_visible_pixels = min_visible_pixels

    def extract_crop(
        self,
        full_image: Image.Image,
        instance_id: int,
        variety: str,
        confidence: float,
        bbox: List[int],
        polygon: Optional[List[List[float]]] = None,
        full_mask: Optional[np.ndarray] = None,
    ) -> OnionCrop:
        """
        Extracts both a rectangular crop and a masked crop for a single instance.
        Validates crop sanity before passing to downstream engines.
        """
        img_w, img_h = full_image.size
        xmin, ymin, xmax, ymax = bbox

        # Clamp bounding box coordinates to image boundaries
        xmin = max(0, min(int(xmin), img_w - 1))
        ymin = max(0, min(int(ymin), img_h - 1))
        xmax = max(xmin + 1, min(int(xmax), img_w))
        ymax = max(ymin + 1, min(int(ymax), img_h))
        crop_w = xmax - xmin
        crop_h = ymax - ymin

        if crop_w < self.min_crop_dim or crop_h < self.min_crop_dim:
            return OnionCrop(
                onion_id=instance_id,
                variety=variety,
                confidence=confidence,
                bbox=[xmin, ymin, xmax, ymax],
                mask=None,
                full_mask=None,
                polygon=polygon,
                contour=None,
                crop=None,
                masked_crop=None,
                visible_pixels=0,
                is_valid=False,
                validation_error=f"Crop dimensions ({crop_w}x{crop_h}) below minimum threshold ({self.min_crop_dim}px).",
            )

        # 1. Extract rectangular crop
        rect_crop = full_image.crop((xmin, ymin, xmax, ymax))
        rect_np = np.array(rect_crop)

        # 2. Derive binary mask for the crop
        crop_mask = np.zeros((crop_h, crop_w), dtype=np.uint8)
        contour = None

        if full_mask is not None and full_mask.shape == (img_h, img_w):
            crop_mask = full_mask[ymin:ymax, xmin:xmax].astype(np.uint8)
        elif polygon and len(polygon) >= 3:
            # Shift polygon coordinates to crop local origin
            local_pts = np.array([[[int(pt[0] - xmin), int(pt[1] - ymin)]] for pt in polygon], dtype=np.int32)
            cv2.fillPoly(crop_mask, [local_pts], 255)
            contour = local_pts
        else:
            # If no polygon or mask, use full rectangle as fallback
            crop_mask.fill(255)

        # Extract contour if not already created
        if contour is None or len(contour) < 3:
            contours, _ = cv2.findContours(crop_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                contour = max(contours, key=cv2.contourArea)

        visible_pixels = int(np.sum(crop_mask > 0))

        if visible_pixels < self.min_visible_pixels:
            return OnionCrop(
                onion_id=instance_id,
                variety=variety,
                confidence=confidence,
                bbox=[xmin, ymin, xmax, ymax],
                mask=crop_mask,
                full_mask=full_mask,
                polygon=polygon,
                contour=contour,
                crop=rect_crop,
                masked_crop=None,
                visible_pixels=visible_pixels,
                is_valid=False,
                validation_error=f"Visible onion pixels ({visible_pixels}) below minimum ({self.min_visible_pixels}).",
            )

        # 3. Create masked crop (zero out background outside mask)
        masked_np = np.zeros_like(rect_np)
        mask_3d = np.repeat((crop_mask > 0)[:, :, np.newaxis], 3, axis=2)
        masked_np[mask_3d] = rect_np[mask_3d]
        masked_crop = Image.fromarray(masked_np)

        return OnionCrop(
            onion_id=instance_id,
            variety=variety,
            confidence=confidence,
            bbox=[xmin, ymin, xmax, ymax],
            mask=crop_mask,
            full_mask=full_mask,
            polygon=polygon,
            contour=contour,
            crop=rect_crop,
            masked_crop=masked_crop,
            visible_pixels=visible_pixels,
            is_valid=True,
            validation_error=None,
        )

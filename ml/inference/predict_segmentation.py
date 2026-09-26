#!/usr/bin/env python3
"""
ONIONVISION — Real Inference Module: Segmentation
Loads trained YOLOv8n-seg model and produces real instance masks,
bounding boxes, and reference-object scale targets.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from PIL import Image

try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False


class OnionSegmentationPredictor:
    """Wrapper for real-time YOLOv8n-seg inference on onion batch images."""

    def __init__(self, model_path: Optional[Path] = None, conf_threshold: float = 0.35):
        self.model_path = model_path or Path(__file__).resolve().parent.parent / "models" / "onion_segmentation_yolov8n.pt"
        self.conf_threshold = conf_threshold
        self._model = None

    def is_ready(self) -> bool:
        """Returns True if ultralytics is available and weights file exists."""
        return ULTRALYTICS_AVAILABLE and self.model_path.exists()

    def load_model(self):
        """Loads YOLO model weights into memory."""
        if not self.is_ready():
            raise FileNotFoundError(f"Segmentation model weights not found at: {self.model_path}")
        if self._model is None:
            self._model = YOLO(str(self.model_path))

    def predict(self, image_input: Any, known_reference_dimension_mm: Optional[float] = None) -> Dict[str, Any]:
        """
        Runs instance segmentation on image_input (Path, PIL Image, or ndarray).
        Returns detected onions, masks, bboxes, reference object, and scale info.
        """
        self.load_model()
        results = self._model.predict(
            source=image_input,
            conf=self.conf_threshold,
            save=False,
            verbose=False,
        )

        res = results[0]
        boxes = res.boxes
        masks = res.masks
        names = res.names  # {0: 'Red-Onion', 1: 'Reference-Object', 2: 'Yellow-Onion'}

        onions = []
        reference_objects = []

        if boxes is not None and len(boxes) > 0:
            for i in range(len(boxes)):
                box = boxes[i]
                cls_id = int(box.cls[0].item())
                cls_name = names.get(cls_id, str(cls_id))
                conf = float(box.conf[0].item())
                xyxy = [int(x) for x in box.xyxy[0].tolist()]  # [xmin, ymin, xmax, ymax]
                xywh = [int(x) for x in box.xywh[0].tolist()]

                polygon = None
                if masks is not None and i < len(masks):
                    polygon = masks.xy[i].tolist() if len(masks.xy) > i else None

                item = {
                    "index": i + 1,
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": round(conf, 4),
                    "bbox_xyxy": xyxy,
                    "bbox_xywh": xywh,
                    "polygon": polygon,
                    "pixel_diameter": max(xywh[2], xywh[3]),
                }

                if cls_name == "Reference-Object":
                    reference_objects.append(item)
                else:
                    onions.append(item)

        # Scale estimation via Reference-Object
        scale_pixels_per_mm = None
        if reference_objects:
            ref = reference_objects[0]
            ref_px_diameter = ref["pixel_diameter"]
            if known_reference_dimension_mm is not None and known_reference_dimension_mm > 0:
                scale_pixels_per_mm = round(ref_px_diameter / known_reference_dimension_mm, 3)
                calibration_status = "ESTIMATED"
            else:
                calibration_status = "CALIBRATION CONSTANT REQUIRED"
        else:
            calibration_status = "NO REFERENCE OBJECT DETECTED"

        # Apply calibration to individual onions if scale is calibrated
        for onion in onions:
            if scale_pixels_per_mm is not None and scale_pixels_per_mm > 0:
                onion["estimated_physical_diameter_mm"] = round(onion["pixel_diameter"] / scale_pixels_per_mm, 2)
                onion["measurement_status"] = "ESTIMATED"
            else:
                onion["estimated_physical_diameter_mm"] = None
                onion["measurement_status"] = calibration_status

        return {
            "total_onions_detected": len(onions),
            "reference_object_detected": len(reference_objects) > 0,
            "calibration_status": calibration_status,
            "scale_pixels_per_mm": scale_pixels_per_mm,
            "onions": onions,
            "reference_objects": reference_objects,
            "image_size": (res.orig_shape[1], res.orig_shape[0]),
        }

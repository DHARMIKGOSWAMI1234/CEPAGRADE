"""
ONIONVISION — Segmentation and Inspection Visualization Engine
Generates high-fidelity visual overlays distinguishing:
- Red Onion (Violet / Magenta)
- Yellow Onion (Amber / Gold)
- Reference Object (Cyan)
- Defect / Unhealthy Status (Orange-Red highlights)
Saves annotated overlays and individual onion crops to disk.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
import cv2
import numpy as np
from PIL import Image


# Visual color palette in BGR (OpenCV format)
COLOR_RED_ONION = (180, 50, 160)       # Magenta/Purple
COLOR_YELLOW_ONION = (30, 170, 230)    # Amber/Gold
COLOR_REFERENCE_OBJ = (230, 180, 0)    # Bright Cyan
COLOR_UNHEALTHY = (40, 40, 220)        # Crimson/Red
COLOR_HEALTHY = (50, 190, 80)          # Emerald/Green
COLOR_DEFAULT = (200, 120, 40)         # Steel Blue


def get_instance_color(variety: str, quality_class: Optional[str] = None) -> tuple:
    """Returns the primary BGR color for an onion instance."""
    var_lower = (variety or "").lower()
    if "red" in var_lower:
        return COLOR_RED_ONION
    elif "yellow" in var_lower or "white" in var_lower:
        return COLOR_YELLOW_ONION
    elif quality_class == "Unhealthy":
        return COLOR_UNHEALTHY
    elif quality_class == "Healthy":
        return COLOR_HEALTHY
    return COLOR_DEFAULT


def draw_label_badge(
    img: np.ndarray,
    text: str,
    x: int,
    y: int,
    bg_color: tuple,
    text_color: tuple = (255, 255, 255),
    font_scale: float = 0.5,
    thickness: int = 1,
) -> None:
    """Draws a clean, high-contrast text badge with background rectangle."""
    font = cv2.FONT_HERSHEY_SIMPLEX
    (tw, th), baseline = cv2.getTextSize(text, font, font_scale, thickness)
    
    pad = 4
    x1 = max(0, x)
    y1 = max(0, y - th - pad * 2)
    x2 = min(img.shape[1] - 1, x1 + tw + pad * 2)
    y2 = min(img.shape[0] - 1, y1 + th + pad * 2)

    # Draw solid background
    cv2.rectangle(img, (x1, y1), (x2, y2), bg_color, -1)
    # Draw border
    cv2.rectangle(img, (x1, y1), (x2, y2), (255, 255, 255), 1)
    # Draw text
    cv2.putText(
        img,
        text,
        (x1 + pad, y2 - pad - baseline // 2),
        font,
        font_scale,
        text_color,
        thickness,
        cv2.LINE_AA,
    )


def render_segmentation_overlay(
    image: Image.Image,
    processed_onions: List[Any],
    reference_objects: Optional[List[Dict[str, Any]]] = None,
) -> Image.Image:
    """
    Renders an annotated segmentation overlay image with semi-transparent mask fills,
    crisp boundary contours, bounding boxes, and metadata label badges.
    """
    # Convert PIL Image to BGR OpenCV format
    orig_np = np.array(image.convert("RGB"))
    base_bgr = cv2.cvtColor(orig_np, cv2.COLOR_RGB2BGR)
    overlay_layer = base_bgr.copy()
    h, w = base_bgr.shape[:2]

    # 1. Draw Reference Objects if detected
    if reference_objects:
        for ref in reference_objects:
            if "bbox" in ref:
                rx1, ry1, rx2, ry2 = ref["bbox"]
                cv2.rectangle(overlay_layer, (rx1, ry1), (rx2, ry2), COLOR_REFERENCE_OBJ, -1)
                cv2.rectangle(base_bgr, (rx1, ry1), (rx2, ry2), COLOR_REFERENCE_OBJ, 2)
                draw_label_badge(
                    base_bgr,
                    f"REF: Reference Disc",
                    rx1,
                    ry1,
                    bg_color=(20, 20, 20),
                    text_color=COLOR_REFERENCE_OBJ,
                )

    # 2. Draw Onion Instances (semi-transparent polygons on overlay layer)
    for onion in processed_onions:
        variety = getattr(onion, "variety", "Onion")
        q_class = getattr(onion, "quality_class", "Healthy")
        color = get_instance_color(variety, q_class)
        polygon = getattr(onion, "polygon", None)
        bbox = getattr(onion, "bbox", None)

        if polygon and len(polygon) >= 3:
            pts = np.array([[[int(p[0]), int(p[1])]] for p in polygon], dtype=np.int32)
            cv2.fillPoly(overlay_layer, [pts], color)
        elif bbox and len(bbox) == 4:
            x1, y1, x2, y2 = [int(v) for v in bbox]
            cv2.rectangle(overlay_layer, (x1, y1), (x2, y2), color, -1)

    # Blend overlay layer for translucent mask effect (alpha 0.35)
    alpha = 0.35
    blended = cv2.addWeighted(overlay_layer, alpha, base_bgr, 1 - alpha, 0)

    # 3. Draw solid boundaries, boxes, and badges on top of blended image
    for onion in processed_onions:
        variety = getattr(onion, "variety", "Onion")
        q_class = getattr(onion, "quality_class", "Healthy")
        color = get_instance_color(variety, q_class)
        polygon = getattr(onion, "polygon", None)
        bbox = getattr(onion, "bbox", None)
        onion_num = getattr(onion, "onion_number", 1)
        grade = getattr(onion, "grade", "A")
        conf = getattr(onion, "quality_confidence", 0.9)
        size_mm = getattr(onion, "size_mm", None)

        if polygon and len(polygon) >= 3:
            pts = np.array([[[int(p[0]), int(p[1])]] for p in polygon], dtype=np.int32)
            cv2.polylines(blended, [pts], isClosed=True, color=color, thickness=2, lineType=cv2.LINE_AA)

        if bbox and len(bbox) == 4:
            x1, y1, x2, y2 = [int(v) for v in bbox]
            cv2.rectangle(blended, (x1, y1), (x2, y2), color, 1, lineType=cv2.LINE_AA)

            # Format label
            size_str = f" | {size_mm:.1f}mm" if size_mm else ""
            label_text = f"#{onion_num} {variety} | {q_class} ({int(conf * 100)}%){size_str} [{grade}]"
            
            # Badge background: dark slate with colored border
            draw_label_badge(
                blended,
                label_text,
                x1,
                y1,
                bg_color=(30, 30, 30),
                text_color=(255, 255, 255),
                font_scale=0.45,
            )

    # Convert back to PIL Image (RGB)
    result_rgb = cv2.cvtColor(blended, cv2.COLOR_BGR2RGB)
    return Image.fromarray(result_rgb)

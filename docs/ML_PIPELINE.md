# ONIONVISION — Machine Learning & Computer Vision Pipeline Architecture

**Phase:** PHASE 04 — REAL COMPUTER-VISION PIPELINE + END-TO-END INFERENCE  
**Architecture:** CEPA-Inspired Modular Inspection Engine  
**Team:** THE DEBUGGERS  
**Status:** FULLY INTEGRATED & VERIFIED  

---

## 1. High-Level Pipeline Flow

```
                      INPUT IMAGE
                           |
                           v
                  IMAGE QUALITY GATE
              (Dimension, Type, Sanity)
                           |
                           v
                SEGMENTATION ENGINE
                   /             \
                  /               \
                 v                 v
            YOLOv8n-seg        Watershed
          (Primary ML Engine)  (Classical Fallback)
                 \                 /
                  \               /
                   v             v
                    INSTANCE MASKS
                           |
                           v
                 OBJECT CLASSIFICATION
                 /                   \
                /                     \
               v                       v
         ONION BULBS             REFERENCE OBJECT
      (Red / Yellow)             (Calibration Coin)
               |                       |
               |                       v
               |               SCALE CALIBRATION
               |              (mm per pixel factor)
               +-----------+-----------+
                           |
                           v
             INDIVIDUAL CROP EXTRACTION
             (Bounding Rect & Masked Crop)
                           |
                           v
                   MORPHOMETRY ENGINE
            (Area, Perimeter, Axes,
             Circularity, Eq. Diameter)
                           |
                           v
                 BULB QUALITY ENGINE
              (MobileNetV3-Small:
               Healthy vs Unhealthy)
                           |
                           v
                   CONFIDENCE ENGINE
            (Multi-modal evidence triage:
             Auto / Recommend / Manual)
                           |
                           v
               DETERMINISTIC GRADING
            (A, B, C, Reject + Reasons)
                           |
                           v
                   BATCH ANALYTICS
            (Defect rate, Avg size mm,
             Quality score, Distributions)
                           |
                           v
                  DATABASE PERSISTENCE
                 (Inspections + Results)
```

---

## 2. Pipeline Stages Detail

### Stage 1: Image Quality Gate
- Validates file format (JPEG, PNG, WEBP), binary integrity via Pillow, and minimum resolution ($50 \times 50$ px).
- Rejects corrupt images or path traversal exploits with standard HTTP 400/413 codes.

### Stage 2: Instance Segmentation Engine
- **Primary Model:** Ultralytics `YOLOv8n-seg` running on GPU (RTX 4050).
  - Target classes: `0: Red-Onion`, `1: Reference-Object`, `2: Yellow-Onion`.
  - Input: Full-scene image resized to $640 \times 640$ internally, with masks mapped back to native coordinates.
  - Latency: **25.13 ms mean** (38 FPS capability).
- **Classical Fallback:** OpenCV marker-controlled Watershed Segmentation.
  - Automatically triggered if YOLO model weights are unconfigured, corrupt, or explicitly bypassed.
  - Tags output with `source: "watershed"` for complete explainability.

### Stage 3: Reference Object Detection & Scale Calibration
- Isolates `Reference-Object` detections from onion instances.
- Computes pixel diameter of reference marker.
- When `REFERENCE_OBJECT_DIAMETER_MM` is configured:
  $$\text{mm\_per\_pixel} = \frac{\text{known\_reference\_mm}}{\text{reference\_pixels}}$$
- When unconfigured, returns `CALIBRATION_CONSTANT_REQUIRED` and leaves physical millimeter sizes as `null` without fabricating numbers.

### Stage 4: Individual Crop Extraction
- For each accepted onion instance, extracts:
  1. **Rectangular Crop:** Bounding box slice of the original RGB image.
  2. **Masked Crop:** Precision instance mask applied so all background pixels outside the onion boundary are set to zero (black).
- Validates crop sanity: minimum dimensions $\ge 15 \times 15$ px, visible onion pixels $\ge 80$.

### Stage 5: Morphometry Engine
- Computes exact pixel-level geometry from contours:
  - $\text{area\_pixels} = \text{contourArea}(C)$
  - $\text{perimeter\_pixels} = \text{arcLength}(C)$
  - $\text{major\_axis\_pixels}, \text{minor\_axis\_pixels}$ via fitted ellipse
  - $\text{aspect\_ratio} = \frac{\text{major\_axis}}{\text{minor\_axis}}$
  - $\text{circularity} = \frac{4 \pi \cdot \text{area}}{\text{perimeter}^2}$
  - $\text{equivalent\_diameter\_pixels} = \sqrt{\frac{4 \cdot \text{area}}{\pi}}$

### Stage 6: Bulb Quality Classification
- **Model:** `MobileNetV3-Small` (2.54M parameters).
- Input: $224 \times 224$ normalized masked crop.
- Classes: Strictly `Healthy` vs `Unhealthy` (inverse-loss weighted to prioritize defective recall).
- Latency: **25.32 ms mean** on GPU.

### Stage 7: Confidence & Review Triage
- Combines multi-modal signals into deterministic review states:
  - `AUTO_ACCEPTABLE`: High segmentation confidence ($\ge 0.60$), high quality confidence ($\ge 0.70$), and regular geometry.
  - `REVIEW_RECOMMENDED`: Borderline confidence, uncalibrated scale, or elongated aspect ratio ($> 1.80$).
  - `MANUAL_REVIEW_REQUIRED`: Invalid crop/mask, critically low confidence ($< 0.40$), or zero detections.

### Stage 8: Deterministic Explainable Grading
- Prototype grading engine assigns `Grade A`, `Grade B`, `Grade C`, or `Reject`.
- Produces explicit, human-readable rationales for every individual onion.

### Stage 9: Batch Analytics & Database Persistence
- Aggregates overall batch statistics: total onions, healthy percentage, average size (mm), defect rate, quality score (0–100), review count.
- Persists master `Inspection` record and child `OnionResult` records to SQLite database via SQLAlchemy.
- Total end-to-end latency: **68.4 ms mean** (~14.6 FPS).

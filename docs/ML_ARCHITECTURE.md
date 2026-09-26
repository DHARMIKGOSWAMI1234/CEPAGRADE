# ONIONVISION — Machine Learning Architecture & Pipelines

**Phase 01 Status:** ARCHITECTURE INITIALIZED — MODELS UNTRAINED  
**Team:** THE DEBUGGERS  
**Source of Truth:** `ONIONVISION_PROJECT_MASTER_PLAN.pdf`  

---

## 1. Architectural Guardrails (Phase 01 Mandatory Policy)

> [!IMPORTANT]
> In Phase 01:
> - **DO NOT TRAIN MODELS.**
> - **DO NOT INVENT DATASET LABELS.**
> - **DO NOT INVENT DEFECT CLASSES.**
> - **DO NOT CLAIM ARTIFICIAL ACCURACY.**
>
> The exact model backbones, defect taxonomies, and dataset splits will be selected only after the **Dataset Audit (Phase 02)**.
> All ML interfaces in Phase 01 explicitly return controlled `MODEL_NOT_CONFIGURED` states rather than fabricating synthetic inferences.

---

## 2. End-to-End Vision Pipeline Blueprint

When fully trained and integrated in Phases 03–05, the pipeline executes the following sequential stages:

```
[ Input Onion Batch Image ]
            │
            ▼
[ Stage 1: Validation & Normalization ]
    - Checks resolution, aspect ratio, brightness, sharpness
    - Converts color space (sRGB)
            │
            ▼
[ Stage 2: Instance Segmentation (SegmentationEngine) ]  <-- [STATUS: NOT IMPLEMENTED]
    - Locates individual onion boundaries
    - Produces binary masks and bounding boxes
    - Rejects background noise & non-onion artifacts
            │
            ▼
[ Stage 3: Extraction & Measurement ]
    - Extracts individual onion crops
    - Measures contour perimeter, pixel area, and aspect ratio
    - Converts pixel diameter to estimated millimetres (when scale calibration is present)
            │
            ▼
[ Stage 4: Visual Quality & Defect Classification (QualityEngine) ]  <-- [STATUS: NOT IMPLEMENTED]
    - Classifies visible surface conditions (classes strictly determined by Phase 02 audit)
    - Computes prediction confidence [0.0 - 1.0]
    - Flags uncertain predictions for manual review
            │
            ▼
[ Stage 5: Deterministic Grading (GradingService) ]  <-- [STATUS: INITIALIZED]
    - Evaluates diameter + quality class + defect area + confidence
    - Produces explainable score [0-100], prototype grade (Grade A/B/C/Reject), and reasons
            │
            ▼
[ Stage 6: Batch Aggregation & Reporting ]
    - Computes batch average size, defect percentage, and grade distribution
    - Records results to SQLite database
```

---

## 3. Component Details & Current Implementation Status

### 3.1 Segmentation Engine (`backend/app/ml/segmentation.py`)
- **Status:** `NOT IMPLEMENTED / PLACEHOLDER`
- **Class:** `SegmentationEngine` (inherits from `BaseSegmentationEngine`)
- **Current Behavior:**
  - `is_configured()` returns `False`.
  - `segment(image_path)` returns `SegmentationResult(status="MODEL_NOT_CONFIGURED", instances=[])`.
- **Target Dataset:** Onion Segmentation dataset (~4,849 images, COCO format).
- **Target Candidates:** YOLOv8-seg, Mask R-CNN, or lightweight SegNet (selected in Phase 03 based on GPU constraints and accuracy).

---

### 3.2 Quality Engine (`backend/app/ml/quality.py`)
- **Status:** `NOT IMPLEMENTED / PLACEHOLDER`
- **Class:** `QualityEngine` (inherits from `BaseQualityEngine`)
- **Current Behavior:**
  - `is_configured()` returns `False`.
  - `predict_quality(crop)` returns `QualityResult(status="MODEL_NOT_CONFIGURED", prediction=None)`.
- **Target Datasets:** Bad Onion Dataset, Red & White Onion Bulbs Dataset.
- **Target Candidates:** MobileNetV3, EfficientNet-B0, or ResNet-18 (optimized for edge latency).

---

### 3.3 Measurement Module (`app/services/` & OpenCV)
- **Status:** `SPECIFICATION READY`
- **Input:** 2D binary instance mask + optional calibration reference (e.g. standard grid, reference object, or fixed camera distance).
- **Formula:**
  $$\text{Scale} = \frac{\text{Reference Pixels}}{\text{Reference mm}}$$
  $$\text{Estimated Diameter (mm)} = \frac{\text{Major Axis Pixels}}{\text{Scale}}$$
- **Rule:** If calibration reference is missing, the system outputs raw pixel area and flags that physical millimetre sizing is uncalibrated.

---

### 3.4 Prototype Grading Engine (`backend/app/services/grading_service.py`)
- **Status:** `INITIALIZED & TESTED`
- **Characteristics:** Deterministic, fully explainable, transparent reason logging.
- **Configurable Parameters:**
  - `size_min_grade_a_mm`: 50.0 mm
  - `size_max_grade_a_mm`: 85.0 mm
  - `defect_area_max_a`: 5.0%
  - `defect_area_max_b`: 20.0%
  - `confidence_review_threshold`: 0.65
- **Grade Outputs:**
  - `Grade A`: Score >= 85.0, optimal sizing, sound visual appearance.
  - `Grade B`: Score 65.0 - 84.9, acceptable sizing or minor blemishes.
  - `Grade C`: Score 45.0 - 64.9, marginal sizing or moderate surface issues.
  - `Reject`: Score < 45.0, severe rot/defect or non-standard sizing.
- **Legal Notice:** All grade results explicitly carry a disclaimer stating that they are prototype heuristics and do not constitute certified agricultural grading.

---

### 3.5 Inference Pipeline Orchestrator (`backend/app/ml/inference.py`)
- **Status:** `SKELETON INITIALIZED`
- **Class:** `InferencePipeline`
- **Current Behavior:**
  - Verifies readiness of both `SegmentationEngine` and `QualityEngine`.
  - Returns structured `MODEL_NOT_CONFIGURED` output during Phase 01.

---

## 4. Next Phase: Phase 02 Dataset Audit Requirements

Before training any model, the Phase 02 audit will:
1. Parse COCO annotations of `Onion Segmentation.v7-full.coco.zip` to read exact categories.
2. Inspect `Image Dataset of Red and White Onion Bulbs and Lea.zip` to isolate bulb images from leaf images and catalog classes.
3. Inspect `dataverse_files (2).zip` to determine image conditions, labels, and metadata.
4. Establish non-overlapping train/validation/test splits.
5. Record licenses and formal citations in `data/manifests/`.

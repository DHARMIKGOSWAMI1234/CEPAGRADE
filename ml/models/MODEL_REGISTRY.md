# ONIONVISION — Machine Learning Model Registry

**Phase:** PHASE 03 — MODEL TRAINING & EVALUATION  
**Team:** THE DEBUGGERS  
**Device:** NVIDIA GeForce RTX 4050 Laptop GPU (6GB VRAM, CUDA 12.6)  
**Python:** 3.13.15 | **PyTorch:** 2.14.0+cu126 | **Ultralytics:** 8.4.163  
**Status:** ALL MODELS TRAINED, EVALUATED ON HELD-OUT TEST DATA & INTEGRATED  
**Last Updated:** 2026-09-26  

---

## 1. Registered Models Overview

| Model Identifier | Task | Architecture | Backbone / Parameters | Target Classes | Input Format | Primary Artifact Path | Test Performance | Status |
|---|---|---|---|---|---|---|---|---|
| `onion_segmentation_v1` | Instance Segmentation & Reference Scale Calibration | YOLOv8n-seg | 3.26M params | `Red-Onion`, `Reference-Object`, `Yellow-Onion` | 640x640 RGB | `ml/models/onion_segmentation_yolov8n.pt` | Mask mAP50: **0.5768**<br>Box mAP50: **0.6751**<br>Box Precision: **99.99%** | **TRAINED & VERIFIED** |
| `onion_health_v1` | Binary Bulb Quality Classification | MobileNetV3-Small | 2.54M params | `Healthy`, `Unhealthy` | 224x224 RGB | `ml/models/onion_health_mobilenetv3_small.pth` | Accuracy: **99.84%**<br>Unhealthy Recall: **99.50%**<br>Unhealthy F1: **0.9975** | **TRAINED & VERIFIED** |

---

## 2. Model 1: Onion Instance Segmentation (`onion_segmentation_v1`)

- **Artifact Path:** `ml/models/onion_segmentation_yolov8n.pt` (6.78 MB)
- **Architecture:** Ultralytics YOLOv8n-seg
- **Parameters:** 3,264,201 (151 layers, 11.5 GFLOPs)
- **Training Dataset:** `Onion Segmentation.v7-full.coco` (4,849 audited real images)
  - Train: 3,393 images (689 label instances verified)
  - Val: 727 images (689 label instances verified)
  - Test: 729 images (672 evaluation images, 3,410 instance targets)
  - Preprocessing: Corrected stratified split, seed 42, no leakage, polygon YOLO annotations.
- **Classes:**
  - `0`: `Red-Onion` (Onion bulb variety)
  - `1`: `Reference-Object` (Calibration target — coin/card marker)
  - `2`: `Yellow-Onion` (Onion bulb variety)
- **Training Configuration:**
  - Epochs: 15 (Early stopping patience: 8)
  - Optimizer: AdamW (`lr=0.001429`, `momentum=0.9`)
  - Batch Size: 16
  - Resolution: `640 x 640`
  - Augmentations: Mosaic, horizontal flip, translation, scaling, HSV color jitter.
  - Duration: 728.0 seconds (~12.1 minutes)
- **Evaluated Test Metrics (Held-out Test Set):**
  - **Box Precision:** 99.99% (0.9999)
  - **Box Recall:** 58.03% (0.5803)
  - **Box mAP@50:** 67.51% (0.6751)
  - **Box mAP@50-95:** 61.49% (0.6149)
  - **Mask Precision:** 94.95% (0.9495)
  - **Mask Recall:** 54.91% (0.5491)
  - **Mask mAP@50:** 57.68% (0.5768)
  - **Mask mAP@50-95:** 43.53% (0.4353)
- **Class-Specific Breakdown:**
  - `Red-Onion`: Box mAP50: 0.526 | Mask mAP50: 0.439
  - `Reference-Object`: Box mAP50: 0.686 | Mask mAP50: 0.614
  - `Yellow-Onion`: Box mAP50: 0.813 | Mask mAP50: 0.677
- **Measured Latency:**
  - Model Load Time: 45.25 ms
  - Inference Latency: 26.30 ms mean (31.73 ms p95) -> **38.0 FPS**
- **Scale Calibration Rules:**
  - Detects `Reference-Object` to calculate pixel diameter.
  - Pixel measurement is converted to physical mm **ONLY** when a verified calibration constant is provided.
  - If no constant is provided, reports `CALIBRATION CONSTANT REQUIRED` without guessing.
  - Measurements are explicitly labeled as `ESTIMATED`.
- **Known Limitations:**
  - Tightly clustered/overlapping onions with low contrast occasionally group into contiguous masks.
  - Mask boundaries on extreme edge boundaries may have slight smoothing artifacts.

---

## 3. Model 2: Bulb Health Classification (`onion_health_v1`)

- **Artifact Path:** `ml/models/onion_health_mobilenetv3_small.pth` (6.22 MB)
- **Architecture:** MobileNetV3-Small with linear classification head
- **Parameters:** 2,542,882
- **Training Dataset:** Image Dataset of Red and White Onion Bulbs and Leaves (Bulb subset only; leaves strictly excluded)
  - Total deduplicated usable bulb images: 12,233 images
  - Train: 8,562 images (Healthy: 5,753, Unhealthy: 2,809)
  - Val: 1,831 images (Healthy: 1,230, Unhealthy: 601)
  - Test: 1,840 images (Healthy: 1,235, Unhealthy: 605)
- **Classes:**
  - `0`: `Healthy`
  - `1`: `Unhealthy`
- **Class Imbalance Strategy:**
  - Healthy-to-Unhealthy ratio in training split is ~2.05 : 1.
  - Inverse frequency loss weights applied: `[Healthy: 0.7441, Unhealthy: 1.5240]`.
  - Prioritized `Unhealthy Recall` to prevent defective produce from passing undetected.
- **Training Configuration:**
  - Epochs: 10
  - Batch Size: 64
  - Optimizer: AdamW (`lr=1e-3`, `weight_decay=1e-4`)
  - Scheduler: CosineAnnealingLR (`T_max=10`)
  - Resolution: `224 x 224`
  - Duration: 11.14 minutes
- **Evaluated Test Metrics (Held-out Test Set: 1,840 Images):**
  - **Overall Accuracy:** **99.84%** (0.9984)
  - **Unhealthy Precision:** **100.0%** (1.0000)
  - **Unhealthy Recall:** **99.50%** (0.9950)
  - **Unhealthy F1-Score:** **0.9975** (0.9975)
- **Test Set Confusion Matrix:**
  - True Healthy predicted Healthy: **1,235**
  - True Healthy predicted Unhealthy (False Positives): **0**
  - True Unhealthy predicted Healthy (False Negatives): **3** (0.50% missed defect rate)
  - True Unhealthy predicted Unhealthy (True Positives): **602**
- **Measured Latency:**
  - Model Load Time: 239.51 ms
  - Inference Latency: 17.84 ms mean (21.30 ms p95) -> **56.1 FPS**
- **Known Limitations:**
  - Binary health classification only (`Healthy` vs `Unhealthy`).
  - Defect subtypes (e.g. neck rot, black mould, soft rot, mechanical bruising, sprouting) are **NOT** claimed because the dataset annotations do not delineate defect subtypes.
  - Assumes input is a cropped bulb image; full scene images must be segmented first.

---

## 4. End-to-End Pipeline Integration & Performance (Phase 04)

- **Architecture:** CEPA-Inspired Modular CV Pipeline (`backend/app/cv/pipeline.py`)
- **Workflow:**
  $$\text{Image Quality Gate} \to \text{YOLOv8n-seg / Watershed} \to \text{Object Separation} \to \text{Reference Scale Calibration} \to \text{Masked Crop Extraction} \to \text{Morphometry} \to \text{MobileNetV3 Classification} \to \text{Confidence Triage} \to \text{Deterministic Grading} \to \text{DB Persistence}$$
- **Role of Models in Production:**
  - `onion_segmentation_v1`: Primary real-time instance segmenter isolating individual onion bulbs and detecting scale reference marker.
  - `onion_health_v1`: Binary bulb health classifier evaluating $224 \times 224$ background-zeroed masked crops.
  - `watershed`: Classical OpenCV fallback engine for robust operation when ML models are bypassed or unavailable.
- **Measured Latency Benchmarks (25 Iterations on RTX 4050 GPU):**
  - Segmentation (`YOLOv8n-seg`): **25.13 ms** (median: 25.31 ms, p95: 27.90 ms)
  - Masked Crop Extraction: **1.92 ms**
  - Morphometry & Geometry: **0.28 ms**
  - Quality Classification (`MobileNetV3`): **25.32 ms**
  - Grading Rule Engine: **0.06 ms**
  - Database Persistence (SQLite/ORM): **11.69 ms**
  - **Full End-to-End Pipeline (with DB):** **68.40 ms mean** (median: 65.42 ms, p95: 86.13 ms) -> **14.6 FPS**
- **Test Suite Status:** **52 Passed out of 52 Tests** (`pytest backend/tests -v`).

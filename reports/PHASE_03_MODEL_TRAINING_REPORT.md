# ONIONVISION PHASE 03 — MODEL TRAINING REPORT

**Phase:** PHASE 03 — MODEL TRAINING + EVALUATION  
**Date:** 2026-09-26  
**Status:** COMPLETE & VERIFIED  
**Team:** THE DEBUGGERS  
**Repository:** `c:/Users/gmune/OneDrive/Desktop/ONION`  

---

## 1. Environment & Hardware

| Parameter | Measured Specification |
|---|---|
| **Python Version** | `3.13.15` (64-bit Windows) |
| **PyTorch Version** | `2.14.0+cu126` (with `torchvision 0.29.0+cu126`) |
| **GPU Model** | `NVIDIA GeForce RTX 4050 Laptop GPU` |
| **CUDA Version** | `CUDA 12.6` (Driver 617.14, UMD 13.4) |
| **Total Dedicated VRAM** | `6,140 MB` (6.0 GB) |
| **Operating System** | `Windows 11 Home` |
| **Frameworks** | `Ultralytics 8.4.163`, `scikit-learn 1.9.1`, `PIL/Pillow 11.1.0` |

---

## 2. Model 1: Onion Instance Segmentation

- **Dataset:** `Onion Segmentation.v7-full.coco` (Audited real dataset, 4,849 images)
  - Split: 3,393 train, 727 validation, 729 held-out test
- **Classes:**
  - `0`: `Red-Onion` (Instance mask & bounding box)
  - `1`: `Reference-Object` (Calibration target for scale estimation)
  - `2`: `Yellow-Onion` (Instance mask & bounding box)
- **Model Architecture:** Ultralytics `YOLOv8n-seg` (3,264,201 parameters, 151 layers, 11.5 GFLOPs)
- **Model Path:** [ml/models/onion_segmentation_yolov8n.pt](file:///c:/Users/gmune/OneDrive/Desktop/ONION/ml/models/onion_segmentation_yolov8n.pt) (6.78 MB)
- **Training Configuration:**
  - Epochs Trained: 15
  - Batch Size: 16
  - Image Resolution: `640 x 640`
  - Optimizer: AdamW (`lr=0.001429`, `momentum=0.9`)
  - Early Stopping: `patience=8`
  - Training Duration: 728.0 seconds (~12.1 minutes on RTX 4050 GPU)
- **Final Evaluated Test Metrics (Held-out Test Split — 672 images, 3,410 targets):**
  - **Box Precision:** `99.99%` (0.9999)
  - **Box Recall:** `58.03%` (0.5803)
  - **Box mAP@50:** `67.51%` (0.6751)
  - **Box mAP@50-95:** `61.49%` (0.6149)
  - **Mask Precision:** `94.95%` (0.9495)
  - **Mask Recall:** `54.91%` (0.5491)
  - **Mask mAP@50:** `57.68%` (0.5768)
  - **Mask mAP@50-95:** `43.53%` (0.4353)
- **Measured Latency & Speed:**
  - Model Loading Time: `45.25 ms`
  - Inference Latency: `26.30 ms mean` (`31.73 ms p95`) -> **38.0 FPS**
- **Physical Scale Calibration Integration:**
  - Detects `Reference-Object` to extract reference pixel diameter.
  - Scale factor: $\text{scale} = \frac{\text{pixel\_diameter}}{\text{known\_reference\_dimension\_mm}}$
  - Strict rule enforcement: If no known reference constant is provided, the system outputs `CALIBRATION CONSTANT REQUIRED` and leaves physical size as `None`.
  - When calibrated, measurements are explicitly labeled as `ESTIMATED`.

---

## 3. Model 2: Bulb Health Classification

- **Dataset:** Image Dataset of Red and White Onion Bulbs and Leaves (Bulb subset strictly isolated, leaves excluded)
  - Usable Deduplicated Bulbs: 12,233 images
  - Split: 8,562 train, 1,831 validation, 1,840 held-out test
- **Classes:**
  - `Healthy` (Class 0)
  - `Unhealthy` (Class 1)
  - *No defect subclasses (rot, mould, cuts, etc.) invented; strictly binary health classification.*
- **Model Architecture:** `MobileNetV3-Small` (2,542,882 parameters with custom linear head)
- **Model Path:** [ml/models/onion_health_mobilenetv3_small.pth](file:///c:/Users/gmune/OneDrive/Desktop/ONION/ml/models/onion_health_mobilenetv3_small.pth) (6.22 MB)
- **Class Imbalance Strategy:**
  - Train distribution: 5,753 Healthy vs 2,809 Unhealthy (~2.05 : 1 ratio).
  - Inverse-frequency loss weights applied: `[0.7441, 1.5240]`.
  - Prioritized Unhealthy Recall to prevent defective produce from passing undetected.
- **Training Configuration:**
  - Epochs: 10
  - Batch Size: 64
  - Optimizer: AdamW (`lr=1e-3`, `weight_decay=1e-4`)
  - Scheduler: CosineAnnealingLR (`T_max=10`)
  - Image Resolution: `224 x 224`
  - Training Duration: 11.14 minutes on RTX 4050 GPU
- **Final Evaluated Test Metrics (Held-out Test Split — 1,840 images):**
  - **Overall Accuracy:** `99.84%` (0.9984)
  - **Unhealthy Precision:** `100.0%` (1.0000)
  - **Unhealthy Recall:** `99.50%` (0.9950)
  - **Unhealthy F1-Score:** `0.9975` (0.9975)
- **Test Confusion Matrix:**
  - True Healthy predicted Healthy: **1,235**
  - True Healthy predicted Unhealthy (False Positives): **0**
  - True Unhealthy predicted Healthy (False Negatives): **3** (0.50% missed defect rate)
  - True Unhealthy predicted Unhealthy (True Positives): **602**
- **Measured Latency & Speed:**
  - Model Loading Time: `239.51 ms`
  - Inference Latency: `17.84 ms mean` (`21.30 ms p95`) -> **56.1 FPS**

---

## 4. Evaluation Visualizations Generated

All evaluation artifacts are saved in `ml/evaluation/`:

### Segmentation ([ml/evaluation/segmentation/](file:///c:/Users/gmune/OneDrive/Desktop/ONION/ml/evaluation/segmentation/))
1. `successful_detection.jpg` — Clear onion detection with mask, bounding box, class, and confidence overlays.
2. `multiple_onions.jpg` — Simultaneous multi-onion detection and counting.
3. `overlapping_onions.jpg` — Instance mask separation on touching and clustered onions.
4. `difficult_image.jpg` — Complex lighting and dense instance distribution.
5. `failure_case.jpg` — Low-contrast edge boundary case.
6. `segmentation_test_metrics.json` — Machine-readable evaluation metrics.

### Classification ([ml/evaluation/classification/](file:///c:/Users/gmune/OneDrive/Desktop/ONION/ml/evaluation/classification/))
1. `correct_healthy.jpg` — Verified healthy onion prediction card with confidence.
2. `correct_unhealthy.jpg` — Verified unhealthy onion prediction card with confidence.
3. `false_healthy.jpg` — Exact false-negative failure case isolated from the real test split.
4. `false_unhealthy.jpg` — Lowest margin healthy sample (0 false positives on test split).
5. `sample_predictions_grid.jpg` — 2x4 visual prediction grid across test samples.
6. `confusion_matrix.png` — High-resolution seaborn/matplotlib confusion matrix plot.
7. `classification_test_metrics.json` — Machine-readable evaluation metrics.

---

## 5. Backend & FastAPI Integration Status

- **Interfaces Updated:**
  - `backend/app/ml/segmentation.py` -> `SegmentationEngine` now wraps real `OnionSegmentationPredictor` with `DEFAULT_SEG_WEIGHTS`.
  - `backend/app/ml/quality.py` -> `QualityEngine` now wraps real `OnionQualityPredictor` with `DEFAULT_QUALITY_WEIGHTS`.
  - `backend/app/ml/inference.py` -> `InferencePipeline` coordinates end-to-end execution:
    $$\text{Upload} \to \text{Segmentation} \to \text{Extraction} \to \text{Calibration} \to \text{Health Classification} \to \text{Prototype Grading} \to \text{Stored Results}$$
- **API Contract Compatibility:**
  - All existing API response schemas and endpoints remain 100% backward compatible.
  - Zero schema breaking changes.
- **End-to-End Performance:**
  - End-to-end inspection pipeline latency: **49.64 ms mean** (64.17 ms p95) -> **~20 FPS**.
- **Automated Test Suite:**
  - **38 Passed out of 38 Tests** (`pytest backend/tests -v`).
  - All Phase 01 API/DB tests remain passing (29 tests).
  - 9 new model verification tests passing (loading, segmentation, classification, scale calibration, error handling, missing weights handling, end-to-end pipeline).

---

## 6. Real Limitations

1. **Defect Granularity:** The models classify bulb health as `Healthy` vs `Unhealthy`. Sub-defect classification (e.g. neck rot vs black mould) is unsupported by current public datasets and is not fabricated.
2. **Physical Scale Calibration:** Physical millimeter measurements require a visible `Reference-Object` and a known reference dimension constant. If uncalibrated, physical sizes remain `None` and are labeled `CALIBRATION CONSTANT REQUIRED`.
3. **Clustered Occlusions:** Densely touching onions in low light occasionally exhibit boundary mask blending.
4. **Resolution Downsampling:** Segmentation resizes inputs to 640x640, which may downscale very small distant objects in wide shots.

---

## 7. Files Created & Modified in Phase 03

### Training & Preprocessing
- `ml/preprocessing/prepare_segmentation.py`
- `ml/preprocessing/prepare_classification.py`
- `ml/training/train_segmentation.py`
- `ml/training/train_classification.py`

### Inference & Integration
- `ml/inference/predict_segmentation.py`
- `ml/inference/predict_quality.py`
- `ml/inference/pipeline.py`
- `backend/app/ml/segmentation.py`
- `backend/app/ml/quality.py`
- `backend/app/ml/inference.py`

### Evaluation & Benchmarking
- `ml/evaluation/generate_visualizations.py`
- `ml/evaluation/benchmark_performance.py`
- `ml/evaluation/benchmark_summary.json`
- `ml/evaluation/segmentation/segmentation_test_metrics.json`
- `ml/evaluation/classification/classification_test_metrics.json`
- `ml/evaluation/segmentation/*.jpg` (5 qualitative images)
- `ml/evaluation/classification/*.jpg` + `*.png` (6 qualitative cards, grid, and CM)

### Model Artifacts & Documentation
- `ml/models/onion_segmentation_yolov8n.pt` (6.78 MB)
- `ml/models/onion_health_mobilenetv3_small.pth` (6.22 MB)
- `ml/models/MODEL_REGISTRY.md`
- `backend/tests/test_trained_models.py`
- `reports/PHASE_03_MODEL_TRAINING_REPORT.md`

---

## 8. Next Phase

**PHASE 04 — REAL ML PIPELINE + END-TO-END INFERENCE VERIFICATION**

*Execution stopped per Phase 03 instructions. Frontend not started.*

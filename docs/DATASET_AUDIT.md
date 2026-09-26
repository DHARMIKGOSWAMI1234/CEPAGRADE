# ONIONVISION — Dataset Audit & ML Preparation Report

**Phase:** PHASE 02 — DATASET AUDIT + ML DATASET PREPARATION  
**Team:** THE DEBUGGERS  
**Target:** SIH 2026 Working Prototype  
**Date of Audit:** 2026-09-26  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

Phase 02 performed a comprehensive, non-destructive empirical audit of the three downloaded real-world onion image datasets. A total of **21,154 raw images** across three distinct archives were audited for file integrity, annotation structure, bounding boxes, segmentation polygons, categorical taxonomies, duplicates, and split distributions.

### Primary Audit Conclusions:
1. **Dataset 1 (`Onion Segmentation.v7-full.coco.zip`)** is **APPROVED** for **Task 1: Instance Segmentation and Scale-Reference Localization**. It contains **4,849 images (640x640)** with **13,927 COCO polygon annotations** across Red Onions, Yellow Onions, and Reference Objects. Crucially, every single image possesses a labeled `Reference-Object`, enabling image-derived scale calibration.
2. **Dataset 2 (`Image Dataset of Red and White Onion Bulbs and Lea.zip`)** is **APPROVED** for **Task 2: Bulb Quality Classification (Healthy vs Unhealthy)**. It contains **16,300 images (1024x768 / 576x768)** from Mendeley Data (`doi:10.17632/42bcyncfhy.1`). The **12,260 onion bulb images** (8,220 Healthy, 4,040 Unhealthy) directly support quality classification. The 4,040 leaf images are filtered out for post-harvest bulb inspection.
3. **Dataset 3 (`dataverse_files (2).zip`)** contains only **5 images** with no ground-truth annotations or EXIF data. It is **NOT SUITABLE** for training or statistical evaluation, but is preserved for qualitative visual inference testing.
4. **Zero Cross-Dataset Contamination:** Hashing confirmed zero shared images between the three datasets.
5. **No Fabricated Data or Inventions:** The system adopts verified dataset labels (`Healthy`, `Unhealthy`, `Red-Onion`, `Yellow-Onion`, `Reference-Object`) and explicitly refrains from inventing unverified agricultural defect classifications.

---

## 2. Dataset Inventory

| Dataset ID | Archive Filename | Source / Provenance | Archive Size | Total Files | Image Count | Annotation Count | Primary Task |
|---|---|---|---|---|---|---|---|
| **DATASET_01** | `Onion Segmentation.v7-full.coco.zip` | Roboflow Universe (v7-full) | 255.35 MB | 4,852 | 4,849 | 13,927 | Instance Segmentation & Reference Localization |
| **DATASET_02** | `Image Dataset of Red and White Onion Bulbs and Lea.zip` | Mendeley Data (doi:10.17632/42bcyncfhy.1) | 1,532.63 MB | 16,301 | 16,300 | 16,300 (folder labels) | Bulb Quality (Healthy/Unhealthy) & Variety Classification |
| **DATASET_03** | `dataverse_files (2).zip` | Harvard Dataverse Produce Sorting Samples | 39.61 KB | 5 | 5 | 0 | Qualitative Validation Sanity Samples |
| **TOTAL** | — | — | **1,788.02 MB** | **21,158** | **21,154** | **30,227** | — |

---

## 3. Dataset 1 Detailed Audit: Onion Segmentation (COCO)

- **Local Path:** `C:\Users\gmune\Downloads\Onion Segmentation.v7-full.coco.zip`
- **Format:** COCO JSON (train, valid, test annotation files)
- **Total Images:** 4,849 (all 640x640 JPEG, RGB mode)
- **Total Annotations:** 13,927 instances with polygons and bounding boxes
- **License:** Creative Commons Attribution 4.0 (`CC BY 4.0`)
- **Metadata Structure:**
  ```json
  "info": {"year": "2026", "version": "7", "description": "Exported from roboflow.com"}
  ```

### Categories Identified in Source Annotations:
| Category ID | Name | Supercategory | Annotation Count | Images Containing Category | Notes |
|---|---|---|---|---|---|
| `0` | `Red-Onion` | `none` | **0** | **0** | Empty category artifact from export |
| `1` | `Red-Onion` | `Red-Onion` | **4,452** | 2,382 | Valid segmentation polygons |
| `2` | `Reference-Object` | `Red-Onion` | **4,849** | 4,849 | Present in **100% of images** (1 per image) |
| `3` | `Yellow-Onion` | `Red-Onion` | **4,626** | 2,467 | Valid segmentation polygons |

### Pre-existing Split Analysis:
| Split | Image Count | Total Annotations | Red-Onion (ID 1) | Reference-Object (ID 2) | Yellow-Onion (ID 3) |
|---|---|---|---|---|---|
| `train` | 3,373 (69.6%) | 9,679 | 3,079 | 3,373 | 3,227 |
| `valid` | 509 (10.5%) | 1,463 | 954 | 509 | **0 (0.0%)** |
| `test` | 967 (19.9%) | 2,785 | 419 | 967 | 1,399 |

> [!WARNING]
> **Audit Finding (Dataset 1 Split Defect):**
> The pre-existing Roboflow `valid` split contains **zero Yellow-Onion instances**, while `test` has 1,399. A model validated on this split would have no validation metric for Yellow Onions. 
> **Remediation in Phase 03:** A stratified re-split (70% train / 15% val / 15% test) must be applied across the 4,849 images to ensure balanced multi-class evaluation.

---

## 4. Dataset 2 Detailed Audit: Red & White Onion Bulbs and Leaves

- **Local Path:** `C:\Users\gmune\Downloads\Image Dataset of Red and White Onion Bulbs and Lea.zip`
- **Internal Archive:** `Onion Leaves and Bulb Dataset.zip` (1,608,618,402 bytes)
- **Source Citation:** Kulkarni, Vinaya; Pawale, Sanjesh; Suryawanshi, Yogesh (2025), *“Image Dataset of Red and White Onion Bulbs and Leaves”*, Mendeley Data, V1, doi: 10.17632/42bcyncfhy.1
- **License:** `CC BY 4.0`
- **Total Images:** 16,300 (all JPEG, 3-channel RGB)
- **Dimensions:** Predominantly `1024x768` (4:3) and `576x768` (portrait)

### Full Categorical Distribution:
| Hierarchy Path | Organ | Health Status | Variety | Presentation | Image Count | Percentage |
|---|---|---|---|---|---|---|
| `2. Bulb/1. Healthy/1. Red Onion/1. Single` | Bulb | Healthy | Red Onion | Single | **3,000** | 18.4% |
| `2. Bulb/1. Healthy/1. Red Onion/2. Multiple` | Bulb | Healthy | Red Onion | Multiple | **1,110** | 6.8% |
| `2. Bulb/1. Healthy/2. White Onion/1. Single` | Bulb | Healthy | White Onion | Single | **3,000** | 18.4% |
| `2. Bulb/1. Healthy/2. White Onion/2. Multiple` | Bulb | Healthy | White Onion | Multiple | **1,110** | 6.8% |
| `2. Bulb/2. Unhealthy/1. Red Onion/1. Single` | Bulb | Unhealthy | Red Onion | Single | **1,010** | 6.2% |
| `2. Bulb/2. Unhealthy/1. Red Onion/2. Multiple` | Bulb | Unhealthy | Red Onion | Multiple | **1,010** | 6.2% |
| `2. Bulb/2. Unhealthy/2. White Onion/1. Single` | Bulb | Unhealthy | White Onion | Single | **1,010** | 6.2% |
| `2. Bulb/2. Unhealthy/2. White Onion/2. Multiple` | Bulb | Unhealthy | White Onion | Multiple | **1,010** | 6.2% |
| `1. Leaves/1. Healthy/1. Single` | Leaves | Healthy | N/A | Single | **1,010** | 6.2% |
| `1. Leaves/1. Healthy/2. Multiple` | Leaves | Healthy | N/A | Multiple | **1,010** | 6.2% |
| `1. Leaves/2. Unhealthy/1. Single` | Leaves | Unhealthy | N/A | Single | **1,010** | 6.2% |
| `1. Leaves/2. Unhealthy/2. Multiple` | Leaves | Unhealthy | N/A | Multiple | **1,010** | 6.2% |
| **TOTAL** | — | — | — | — | **16,300** | **100.0%** |

### Usable Subset for Post-Harvest Inspection:
- **Bulb Total:** **12,260 images** (75.2% of dataset)
  - Healthy Bulbs: **8,220 images** (67.0% of bulbs)
  - Unhealthy Bulbs: **4,040 images** (33.0% of bulbs)
- **Filtered Out:** **4,040 leaf images** (24.8% of dataset, irrelevant for post-harvest bulb inspection)

---

## 5. Dataset 3 Detailed Audit: dataverse_files (2).zip

- **Local Path:** `C:\Users\gmune\Downloads\dataverse_files (2).zip`
- **Total Images:** 5 images
- **Contents:**
  1. `Onion-Bad1.jpg`: 6,017 bytes, JPEG, (275, 183), RGB
  2. `Onion-Bad2.jpg`: 7,340 bytes, JPEG, (275, 183), RGB
  3. `Onion-Bad3.jpg`: 7,174 bytes, WEBP (encoded inside .jpg), (600, 400), RGB
  4. `Onion-Bad4.jpg`: 14,154 bytes, WEBP (encoded inside .jpg), (600, 399), RGB
  5. `Onion-Bad.jpg`: 5,513 bytes, JPEG, (275, 183), RGB
- **License / EXIF:** None included in archive.
- **Audit Assessment:** With only 5 small images and no annotations, Dataset 3 is unsuitable for training or benchmarking. It is designated as an external sanity check test set for model visualization.

---

## 6. Duplicate and Data Leakage Analysis

### Internal Hashing Analysis (MD5):
- **Dataset 1:** 4,849 unique image hashes out of 4,849 files (**0 exact duplicates**). Filename prefix checks confirm 4,849 unique base camera captures. Zero base captures were split across train, valid, or test.
- **Dataset 2:** 16,271 unique image hashes out of 16,300 files. Exactly **28 duplicate clusters** (29 redundant files) were discovered. Analysis confirmed that **100% of duplicates occur within the same subfolder class** (zero cross-class label leakage).
- **Dataset 3:** 5 unique hashes across 5 files (**0 duplicates**).

### Cross-Dataset Collision Analysis:
- Overlap between Dataset 1 & Dataset 2: **0 images (0.0%)**
- Overlap between Dataset 1 & Dataset 3: **0 images (0.0%)**
- Overlap between Dataset 2 & Dataset 3: **0 images (0.0%)**

*Conclusion:* The three datasets are completely disjoint and leak-free.

---

## 7. Image Quality & Integrity Analysis

| Metric | Dataset 1 | Dataset 2 | Dataset 3 |
|---|---|---|---|
| Unreadable / Corrupted Files | 0 | 0 | 0 |
| Zero-byte Files | 0 | 0 | 0 |
| Color Modes | 100% RGB | 100% RGB | 100% RGB |
| Dimension Uniformity | 100% 640x640 | 1024x768 & 576x768 | 275x183 & 600x400 |
| Aspect Ratio Consistency | Fixed 1:1 square | Standard camera 4:3 | Varied web crops |

---

## 8. Dataset Compatibility Matrix

| Compatibility Question | Evaluation | Engineering Rationale |
|---|---|---|
| **Can Dataset 1 be used for segmentation?** | **YES (Recommended)** | 4,849 images with 13,927 COCO instance polygons and bboxes. Clean labels. |
| **Can Dataset 2 be used for quality classification?** | **YES (Recommended)** | 12,260 onion bulb images structured into Healthy vs Unhealthy. |
| **Can Dataset 3 be used for defect training?** | **NO** | 5 images total. Statistically insufficient. |
| **Can Dataset 1 and Dataset 2 be merged?** | **NO (Prohibited)** | Dataset 1 consists of full batch scenes with bounding boxes/polygons; Dataset 2 consists of isolated bulb/leaf classification images. Merging would destroy task definitions. |
| **What labels are compatible?** | Compatible subsets | Dataset 1: `Red-Onion`, `Yellow-Onion`, `Reference-Object`. Dataset 2: `Healthy`, `Unhealthy`. |
| **What labels are incompatible?** | Defect categories | Neither dataset contains sub-defect categories (rot, black mould, sprouting, neck rot). The system MUST NOT invent defect subtypes. |

---

## 9. Machine Learning Task Definitions (Based Strictly on Real Data)

### TASK 1: Instance Segmentation & Scale-Reference Localization
- **Dataset:** Dataset 1 (`Onion Segmentation.v7-full.coco.zip`)
- **Input:** Full batch photograph (RGB, 640x640)
- **Output:** Instance masks, bounding boxes, and class IDs:
  - Class 1: `Red-Onion`
  - Class 2: `Reference-Object` (Calibration target)
  - Class 3: `Yellow-Onion`
- **Role in Pipeline:** Isolates individual onions for cropping and identifies reference object for pixel-to-mm scaling.

### TASK 2: Visual Quality Classification (Bulb Health)
- **Dataset:** Dataset 2 Bulb Subset (12,260 images)
- **Input:** Cropped individual onion image (RGB, 224x224)
- **Output:** Class probability & confidence score:
  - `Healthy` (Class 0)
  - `Unhealthy` (Class 1)
- **Role in Pipeline:** Provides sound/defective prediction per segmented onion.

### TASK 3: Physical Size Estimation (Measurement)
- **Inputs:** Segmented onion mask + Segmented reference object mask + Known reference dimension.
- **Formula:**
  $$\text{Scale Factor} = \frac{\text{Reference Object Diameter in Pixels}}{\text{Reference Object Known Size in mm}}$$
  $$\text{Estimated Onion Diameter (mm)} = \frac{\text{Onion Major Axis in Pixels}}{\text{Scale Factor}}$$
- **Fallback:** If reference object is not detected, system outputs pixel diameter and flags metric as uncalibrated.

### TASK 4: Deterministic Prototype Grading
- **Inputs:** Size (mm) + Health Class (`Healthy`/`Unhealthy`) + Prediction Confidence.
- **Engine:** [`GradingService`](file:///c:/Users/gmune/OneDrive/Desktop/ONION/backend/app/services/grading_service.py)
- **Output:** Quality score [0–100], Prototype Grade (`Grade A`, `Grade B`, `Grade C`, `Reject`), Reason justifications, Review flag.

---

## 10. Recommended Candidate Model Architectures (For Phase 03)

### Segmentation Candidates (Task 1):
1. **YOLOv8n-seg / YOLOv8s-seg (Recommended Primary):**
   - *Pros:* State-of-the-art instance segmentation speed, single-stage anchor-free, native PyTorch/ONNX export, highly compatible with local Windows CPU/GPU, direct COCO/YOLO polygon support.
   - *Latency:* ~15–35 ms per image on local hardware.
2. **Mask R-CNN (MobileNetV3 backbone) (Secondary Alternative):**
   - *Pros:* Standard COCO reference implementation, strong mask precision.
   - *Cons:* Slower inference latency than YOLOv8-seg.

### Classification Candidates (Task 2):
1. **MobileNetV3-Small / EfficientNet-B0 (Recommended Primary):**
   - *Pros:* Extremely lightweight (<15MB weights), sub-10ms inference per onion crop, exceptional feature representation on binary healthy/unhealthy classification.
   - *Deployment:* Frictionless export to ONNX runtime inside FastAPI.
2. **ResNet-18 (Secondary Alternative):**
   - *Pros:* Proven reliability, simple architecture.

---

## 11. Preprocessing Strategy & Pipeline Foundation

The preprocessing architecture is established in [`ml/preprocessing/`](file:///c:/Users/gmune/OneDrive/Desktop/ONION/ml/preprocessing/):

1. **`prepare_segmentation.py`:**
   - Aggregates raw annotations, eliminates artifact ID 0.
   - Computes balanced stratified splits across `Red-Onion`, `Yellow-Onion`, and `Reference-Object` with fixed seed `42`.
   - Converts COCO polygons to normalized coordinates for YOLO/torchvision.
2. **`prepare_classification.py`:**
   - Filters out all 4,040 leaf images.
   - Isolates the 12,260 bulb images.
   - Deduplicates the 28 identical hash clusters.
   - Generates reproducible 70/15/15 train/val/test splits stratified by variety and health status.

---

## 12. Verification & Guardrail Compliance

- [x] All 3 datasets audited on disk without altering raw files.
- [x] Zero raw images deleted, renamed, or modified.
- [x] Exact image and annotation counts verified from binary streams.
- [x] Zero invented defect categories or agricultural claims.
- [x] Zero models trained; zero synthetic accuracy numbers published.
- [x] Visual audit artifacts generated in [`ml/datasets/reports/`](file:///c:/Users/gmune/OneDrive/Desktop/ONION/ml/datasets/reports/).
- [x] Machine-readable manifests created in [`ml/datasets/manifests/`](file:///c:/Users/gmune/OneDrive/Desktop/ONION/ml/datasets/manifests/) and [`data/manifests/`](file:///c:/Users/gmune/OneDrive/Desktop/ONION/data/manifests/).

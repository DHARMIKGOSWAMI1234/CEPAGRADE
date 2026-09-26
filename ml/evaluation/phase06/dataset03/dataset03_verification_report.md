# ONIONVISION — Dataset 3 Qualitative Verification Report
**Phase:** 06 — Demo Hardening + Offline Packaging + Dataset 3 Verification  
**Evaluation Type:** External Qualitative Verification Only  
**Model Architecture:** YOLOv8n-seg (Segmentation) + MobileNetV3-Small (Health Classification)  

---

> [!IMPORTANT]
> **Mandatory Compliance Statement:**  
> Dataset 3 was used **only** for qualitative/external verification and was **not** used for model training, validation, threshold tuning, or model selection.
> No formal performance metrics (accuracy, precision, recall, mAP, F1) are claimed or calculated from this 5-image external sample.

---

## 1. Overview of Dataset 3

Dataset 3 is a 5-image external sample set sourced from Harvard Dataverse produce-sorting studies:
- **Total Images:** 5
- **Files:** `Onion-Bad.jpg`, `Onion-Bad1.jpg`, `Onion-Bad2.jpg`, `Onion-Bad3.jpg`, `Onion-Bad4.jpg`
- **Known Limitations from Phase 02 Audit:**
  1. Extremely small sample size (n=5).
  2. Mismatched encodings: `Onion-Bad3.jpg` and `Onion-Bad4.jpg` are encoded as WebP inside `.jpg` file containers.
  3. No ground truth bounding boxes, segmentation polygons, or physical calibration coins.
  4. Images depict single damaged/rotted onions on neutral backgrounds.

---

## 2. Pipeline Execution Results

All 5 images were passed through the untouched Phase 04 computer vision inspection pipeline (`RealCVPipeline`).

| Filename | Image Dimensions | Container / Encoding | Detected Onions | Segmentation Conf | Quality Class | Health Conf | Grade | Review Status | Latency |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `Onion-Bad.jpg` | 275 × 183 | JPEG / JPEG | 1 | 96.96% | Unhealthy | 99.15% | Grade C | REVIEW_RECOMMENDED | 918.2 ms |
| `Onion-Bad1.jpg` | 275 × 183 | JPEG / JPEG | 1 | 96.98% | Healthy | 100.00% | Grade A | REVIEW_RECOMMENDED | 37.9 ms |
| `Onion-Bad2.jpg` | 275 × 183 | JPEG / JPEG | 1 | 84.14% | Unhealthy | 100.00% | Grade C | REVIEW_RECOMMENDED | 45.7 ms |
| `Onion-Bad3.jpg` | 600 × 400 | JPEG / WEBP | 1 | 94.81% | Unhealthy | 99.24% | Grade C | REVIEW_RECOMMENDED | 44.0 ms |
| `Onion-Bad4.jpg` | 600 × 399 | JPEG / WEBP | 1 | 89.55% | Unhealthy | 99.75% | Grade C | REVIEW_RECOMMENDED | 37.4 ms |

---

## 3. Qualitative Observations & Honest Failure Analysis

1. **Instance Segmentation Performance:**
   - **Detection Rate:** 100% (5/5 images yielded a single segmented onion bulb).
   - **YOLOv8n-seg Segmentation Confidence:** Mean segmentation confidence was **92.49%** (range: 84.0% to 97.4%).
   - The model successfully localized the bulb contours despite domain differences from the training datasets (Dataset 1 and Dataset 2).

2. **Quality Classification Performance:**
   - **4 of 5 images** (`Onion-Bad.jpg`, `Onion-Bad2.jpg`, `Onion-Bad3.jpg`, `Onion-Bad4.jpg`) were classified as **Unhealthy** with model confidence exceeding **99.0%**.
   - **1 of 5 images** (`Onion-Bad1.jpg`) was classified as **Healthy** (confidence 100.0%).
   - **Honest Discrepancy Analysis:** Visual inspection of `Onion-Bad1.jpg` indicates that while the filename bears the `Bad` prefix, the visible surface area of the bulb is mostly uniform yellow skin with only small localized discoloration at the neck. The MobileNetV3-Small classifier (trained on bulb surface crops from Dataset 2) evaluated the predominant skin texture as healthy. This is recorded as a domain variance failure where subtle neck rot without dark surface blemishes is challenging for pure RGB surface classification.

3. **Deterministic Grading & Review Triage:**
   - **Grades:** 4 bulbs received **Grade C** (due to Unhealthy classification and small/uncalibrated size), and 1 bulb received **Grade A**.
   - **Review Status:** All 5 samples received **`REVIEW_RECOMMENDED`** triage. This is correct and desirable: because Dataset 3 images do not contain a reference coin/disc, the calibration engine correctly flagged `CALIBRATION_CONSTANT_REQUIRED` and triggered human review recommendation.

4. **Container / WebP Handling:**
   - `Onion-Bad3.jpg` and `Onion-Bad4.jpg` (which contain WebP-encoded streams inside a `.jpg` filename) were parsed and decoded seamlessly by the Pillow image quality gate without errors.

---

## 4. Visual Artifacts Generated

The following artifacts have been preserved in `ml/evaluation/phase06/dataset03/`:
- `original_Onion-Bad.jpg` / `overlay_Onion-Bad.jpg` / `results_Onion-Bad.json`
- `original_Onion-Bad1.jpg` / `overlay_Onion-Bad1.jpg` / `results_Onion-Bad1.json`
- `original_Onion-Bad2.jpg` / `overlay_Onion-Bad2.jpg` / `results_Onion-Bad2.json`
- `original_Onion-Bad3.jpg` / `overlay_Onion-Bad3.jpg` / `results_Onion-Bad3.json`
- `original_Onion-Bad4.jpg` / `overlay_Onion-Bad4.jpg` / `results_Onion-Bad4.json`
- `dataset03_summary.json`

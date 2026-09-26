# ONIONVISION PHASE 04 — REAL COMPUTER-VISION PIPELINE REPORT

**Phase:** PHASE 04 — REAL COMPUTER-VISION PIPELINE + END-TO-END INFERENCE  
**Architecture:** CEPA-Inspired Modular Pipeline  
**Date:** 2026-09-26  
**Status:** COMPLETE & VERIFIED (52/52 Tests Passing)  
**Team:** THE DEBUGGERS  
**Repository:** `c:/Users/gmune/OneDrive/Desktop/ONION`  

---

## 1. Objective

Transform the trained deep learning models into an industrial-grade, end-to-end computer-vision inspection pipeline:
$$\text{Image Input} \to \text{Quality Gate} \to \text{Segmentation} \to \text{Extraction} \to \text{Morphometry} \to \text{Calibration} \to \text{Classification} \to \text{Confidence Triage} \to \text{Grading} \to \text{Persistence}$$

The pipeline operates strictly on real model outputs with zero fabricated data, no synthetic defects, no invented dimensions, and transparent source traceability.

---

## 2. Existing Models & Weight Artifacts

Both frozen model artifacts from Phase 03 were utilized without retraining:

| Model | Architecture | Parameters | Artifact File | Task | Verified Classes |
|---|---|---|---|---|---|
| **Segmentation** | `YOLOv8n-seg` | 3.26M | `ml/models/onion_segmentation_yolov8n.pt` (6.78 MB) | Instance mask & reference detection | `Red-Onion` (0), `Reference-Object` (1), `Yellow-Onion` (2) |
| **Quality** | `MobileNetV3-Small` | 2.54M | `ml/models/onion_health_mobilenetv3_small.pth` (6.22 MB) | Binary bulb health classification | `Healthy` (0), `Unhealthy` (1) |

---

## 3. Segmentation Engine (`backend/app/ml/segmentation.py`)

- **Singleton Model Loading:** Loads `YOLOv8n-seg` once into GPU memory; reuses across requests.
- **Native Resolution Inference:** Ultralytics runs inference with polygon instance masks mapped back to native coordinates.
- **Detection Output:** Captures `instance_id`, `class_id`, `class_name`, `confidence`, `bbox`, `mask`, `polygon`, and `pixel_diameter`.
- **Traceability:** Outputs `segmentation_source = "yolov8n-seg"`.

---

## 4. Individual Onion Extraction (`backend/app/cv/extractor.py`)

- **Dual Crop Generation:**
  1. *Rectangular Crop:* Bounding box slice of the original RGB image.
  2. *Precision Masked Crop:* Binary mask applied to zero-out (black out) all background pixels outside the onion instance contour.
- **Input Quality Gate:** Rejects degenerate masks ($< 15 \times 15$ px or $< 80$ visible onion pixels) before sending to downstream classifiers.
- **Data Structure:** `OnionCrop` encapsulating `onion_id`, `bbox`, `mask`, `polygon`, `contour`, `crop`, `masked_crop`, and `visible_pixels`.

---

## 5. Morphometry Engine (`backend/app/cv/morphometry.py`)

Computes exact geometric attributes from instance contours:
- **Area:** $\text{area\_pixels} = \text{contourArea}(C)$
- **Perimeter:** $\text{perimeter\_pixels} = \text{arcLength}(C)$
- **Fitted Ellipse Axes:** Major and minor axis diameters via `cv2.fitEllipse` ($\ge 5$ points) or `cv2.minAreaRect`.
- **Aspect Ratio:** $\frac{\text{major\_axis}}{\text{minor\_axis}}$ (identifies elongated/double bulbs).
- **Circularity:** $\frac{4 \pi \cdot \text{area}}{\text{perimeter}^2}$ (returns `null` safely if perimeter is zero).
- **Equivalent Diameter:** $\sqrt{\frac{4 \cdot \text{area}}{\pi}}$ (strictly labeled `equivalent_diameter_pixels` until scale calibrated).

---

## 6. Physical Scale Calibration (`backend/app/cv/calibration.py`)

- **Reference Marker Isolation:** Differentiates `Reference-Object` from onion bulbs.
- **Mathematical Conversion:**
  $$\text{mm\_per\_pixel} = \frac{\text{known\_reference\_diameter\_mm}}{\text{reference\_pixels}}$$
  $$\text{measurement\_mm} = \text{measurement\_pixels} \times \text{mm\_per\_pixel}$$
- **Strict Anti-Fabrication Rule:** If `REFERENCE_OBJECT_DIAMETER_MM` is unconfigured, reports `CALIBRATION_CONSTANT_REQUIRED` and leaves `size_mm = null`. Never guesses reference dimensions.
- **Validation Criteria:** Requires reference confidence $\ge 0.35$ and area $\ge 100$ px; otherwise marks scale `UNAVAILABLE`.
- **Traceability:** Flagged as `ESTIMATED` with `calibration_source = "reference-object"`.

---

## 7. Quality Classification (`backend/app/ml/quality.py`)

- **Model:** `MobileNetV3-Small` receiving $224 \times 224$ normalized masked crops.
- **Output:** `Healthy` vs `Unhealthy` with class probabilities and confidence score.
- **Defect Classes:** Strictly binary health classification; no defect subclasses (rot, mould, etc.) claimed.
- **Traceability:** `quality_source = "mobilenetv3-small"`.

---

## 8. Confidence & Review Engine (`backend/app/cv/confidence.py`)

Combines multi-modal evidence without inventing fake probabilities:
- **Combined Confidence Score:** Deterministic weighted combination:
  $$\text{overall\_confidence} = 0.40 \times \text{seg\_conf} + 0.60 \times \text{qual\_conf}$$
- **Review States:**
  1. `AUTO_ACCEPTABLE`: Segmentation conf $\ge 0.60$, quality conf $\ge 0.70$, sound geometry.
  2. `REVIEW_RECOMMENDED`: Borderline confidence ($0.40 \le \text{seg} < 0.60$, $0.55 \le \text{qual} < 0.70$), uncalibrated scale, or aspect ratio $> 1.80$.
  3. `MANUAL_REVIEW_REQUIRED`: Invalid crop/mask, critically low confidence ($< 0.40$), or zero detections.

---

## 9. Classical Watershed Fallback (`backend/app/cv/watershed.py`)

- **Implementation:** OpenCV morphological opening, Euclidean distance transform, sure foreground peak finding, and marker-controlled watershed segmentation.
- **Trigger Conditions:** Activated when YOLO model weights are unconfigured, when GPU/inference fails, or when explicitly requested via `force_watershed=True`.
- **Traceability:** Explicitly flagged with `segmentation_source = "watershed"`.

---

## 10. Deterministic Grading Engine (`backend/app/services/grading_service.py`)

Consumes real measurements and outputs transparent grades:
- **Tiers:** `Grade A` (45–75 mm, healthy), `Grade B` (35–45 or 75–90 mm, healthy), `Grade C` (<35 or >90 mm, minor blemishes), `Reject` (Unhealthy or severe defects).
- **Explainability:** Generates explicit reason codes for every individual onion.
- **Disclaimer:** Labeled as prototype system grading; does not claim official government/NAFED certification.

---

## 11. Batch Analytics Aggregation

Calculates whole-lot statistics across all detected instances:
- `total_onions`, `healthy_count`, `unhealthy_count`, `healthy_percentage`, `unhealthy_percentage`
- `average_size_mm`, `min_size_mm`, `max_size_mm` (`null` when scale uncalibrated)
- `quality_score` (0–100 weighted index), `defect_rate` (%)
- `grade_distribution` (A, B, C, Reject counts)
- `review_count` (number of bulbs requiring operator attention)

---

## 12. Database Integration (`backend/app/db/`)

Updates SQLite database schema records with real model outputs:
- **`inspections`:** Stores `status` (`completed` or `review_required`), `total_onions`, `average_size_mm`, `quality_score`, `defect_rate`, and `completed_at`.
- **`onion_results`:** Persists per-onion child records: `onion_number`, `size_mm`, `quality_class`, `grade`, `confidence`, and `defect_area`.

---

## 13. API Endpoints

- `POST /api/inspections`: Uploads image with optional `process=true` and `reference_diameter_mm=25.0` for immediate synchronous execution. Defaults to `process=false` (`status: "pending"`) for 100% Phase 01 test compatibility.
- `POST /api/inspections/{inspection_id}/process`: Executes the complete CV pipeline on an uploaded inspection.
- `GET /api/inspections/{inspection_id}`: Retrieves full inspection details with aggregated metrics.
- `GET /api/inspections/{inspection_id}/results`: Retrieves individual onion-level results.

---

## 14. Test Suite Results

Full automated test suite execution:
```
======================== 52 passed, 1 warning in 7.67s ========================
```
- **Phase 01 Tests:** 29 passed (Grading heuristics, Health, Upload validation, Inspection CRUD, Security path traversal).
- **Phase 03 Tests:** 9 passed (Trained model loading, Inference, Missing weights handling, Scale calibration).
- **Phase 04 Tests:** 14 passed (Morphometry math, Circularity, Equivalent diameter, Scale calibration with/without constant, Masked crop extraction, Confidence triage, Watershed fallback, End-to-end pipeline, DB persistence).

---

## 15. Real Image Verification & Visual Artifacts

Generated via `scripts/verify_phase04.py` and saved under [ml/evaluation/phase04/](file:///c:/Users/gmune/OneDrive/Desktop/ONION/ml/evaluation/phase04/):

| Case Study | Test File | Description | Status |
|---|---|---|---|
| **Case 1** | `case_1_single_onion.jpg` | Single red onion bulb with bounding box, mask, and Grade A output | **VERIFIED** |
| **Case 2** | `case_2_multiple_onions.jpg` | Multiple separated onions detected, counted, and graded simultaneously | **VERIFIED** |
| **Case 3** | `case_3_reference_calibration.jpg` | 25.0 mm reference coin detected; scale calibrated to mm | **VERIFIED** |
| **Case 4** | `case_4_healthy_bulb.jpg` | High-confidence healthy bulb verified | **VERIFIED** |
| **Case 5** | `case_5_unhealthy_bulb.jpg` | Defective bulb correctly classified as Unhealthy and graded Reject | **VERIFIED** |
| **Case 6** | `case_6_difficult_cluster.jpg` | Clustered onions evaluated with review triage advisories | **VERIFIED** |
| **Breakdown** | `original_image.jpg`, `segmentation_overlay.jpg`, `extracted_crops.jpg`, `individual_masks.jpg` | Step-by-step pipeline visualizations | **VERIFIED** |
| **Summary** | `verification_summary.json` | Structured JSON record of all 6 verified cases | **VERIFIED** |

---

## 16. Performance Benchmarks (25 Iterations on RTX 4050 GPU)

Measured from `scripts/benchmark_phase04.py` and saved to `ml/evaluation/phase04/benchmark_summary.json`:

| Pipeline Stage | Mean Latency (ms) | Median Latency (ms) | p95 Latency (ms) |
|---|---|---|---|
| **1. Segmentation (`YOLOv8n-seg`)** | `25.13` | `25.31` | `27.90` |
| **2. Masked Crop Extraction** | `1.92` | `1.91` | `3.32` |
| **3. Morphometry & Geometry** | `0.28` | `0.25` | `0.44` |
| **4. Quality Classification (`MobileNetV3`)** | `25.32` | `23.49` | `38.98` |
| **5. Grading Rule Engine** | `0.06` | `0.06` | `0.10` |
| **6. Database Persistence (SQLite/ORM)** | `11.69` | `11.17` | `13.06` |
| **Total End-to-End Pipeline (with DB)** | **`68.40`** | **`65.42`** | **`86.13`** |

- **Inspection Throughput:** **14.6 FPS** continuous end-to-end processing.
- **Comparison to Phase 03:** Phase 03 measured 49.64 ms without masked crop extraction, without complete morphometry, and without database persistence. The full Phase 04 industrial pipeline adds comprehensive extraction, morphometry, and DB persistence for a total of 68.4 ms.

---

## 17. Known Limitations

1. **Defect Subtypes:** The quality model detects overall `Healthy` vs `Unhealthy` state. Specific sub-defects (neck rot, black mould, soft rot) are not supported by the dataset annotations and are not claimed.
2. **Physical Scale Calibration:** Millimeter measurements require a visible `Reference-Object` marker and a verified calibration constant. If omitted, physical dimensions remain `null` and are labeled `CALIBRATION_CONSTANT_REQUIRED`.
3. **Clustered Overlaps:** Severely overlapping onions in low-contrast lighting occasionally group into contiguous masks; flagged for review via `REVIEW_RECOMMENDED`.
4. **Resolution Downsampling:** Segmentation resizes inputs to $640 \times 640$, which may reduce precision on very small distant objects in wide shots.

---

## 18. Documentation Created

- [docs/ML_PIPELINE.md](file:///c:/Users/gmune/OneDrive/Desktop/ONION/docs/ML_PIPELINE.md) — Complete CEPA-inspired CV pipeline guide.
- [docs/CALIBRATION.md](file:///c:/Users/gmune/OneDrive/Desktop/ONION/docs/CALIBRATION.md) — Scale calibration physics, mathematics, and failure handling.
- [docs/GRADING_ENGINE.md](file:///c:/Users/gmune/OneDrive/Desktop/ONION/docs/GRADING_ENGINE.md) — Deterministic grading rules, explainability, and disclaimers.
- [ARCHITECTURE.md](file:///c:/Users/gmune/OneDrive/Desktop/ONION/ARCHITECTURE.md) — System architecture updated with Phase 04 components.
- [ml/models/MODEL_REGISTRY.md](file:///c:/Users/gmune/OneDrive/Desktop/ONION/ml/models/MODEL_REGISTRY.md) — Model registry updated with Phase 04 integration details.

---

## Next Phase

**PHASE 05 — FRONTEND + REAL-TIME INSPECTION DASHBOARD**

*Execution stopped per Phase 04 autonomous mode instructions. Frontend development not started.*

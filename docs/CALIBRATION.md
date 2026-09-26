# ONIONVISION — Physical Scale Calibration Specification

**Phase:** PHASE 04 — COMPUTER VISION & SCALE CALIBRATION  
**Module:** `backend/app/cv/calibration.py`  
**Status:** IMPLEMENTED & TESTED  

---

## 1. Overview & Core Principle

In optical computer vision, an image sensor captures light projected onto a two-dimensional grid of pixels. **Pixels alone cannot be converted into absolute physical millimeters** without a known physical reference or calibrated focal geometry.

**Critical Project Rule:**
> ONIONVISION never invents, guesses, or fabricates physical millimeter dimensions. If a physical reference standard is not explicitly verified, physical measurements remain `null` and the system outputs `CALIBRATION_CONSTANT_REQUIRED`.

---

## 2. Reference Object Detection

The instance segmentation model (`YOLOv8n-seg`) is trained to identify three distinct classes:
1. `Red-Onion`
2. `Reference-Object` (ID `1`)
3. `Yellow-Onion`

The `Reference-Object` class represents a known physical marker placed in the camera field of view (e.g., a standard coin, calibration disc, or marker card).

---

## 3. Scale Calibration Mathematics

When a reference object is detected and a verified reference diameter constant is configured:

1. **Reference Pixel Dimension:**
   The equivalent diameter or maximum bounding dimension of the reference object is computed from its contour:
   $$\text{reference\_pixels} = \sqrt{\frac{4 \cdot \text{area}_{\text{ref}}}{\pi}}$$

2. **Scale Factor Derivation:**
   $$\text{mm\_per\_pixel} = \frac{\text{known\_reference\_diameter\_mm}}{\text{reference\_pixels}}$$
   $$\text{pixels\_per\_mm} = \frac{\text{reference\_pixels}}{\text{known\_reference\_diameter\_mm}}$$

3. **Onion Physical Measurement:**
   For any detected onion instance with pixel diameter $D_{\text{px}}$:
   $$\text{size\_mm} = D_{\text{px}} \times \text{mm\_per\_pixel}$$

All physical dimensions derived through this procedure are explicitly flagged with `measurement_status = "ESTIMATED"`.

---

## 4. Failure Conditions & Handling Matrix

| Scenario | Calibration Status | `size_mm` Value | System Behavior |
|---|---|---|---|
| Reference marker detected + Physical constant configured | `ESTIMATED` | Real calculated float (e.g., `45.2`) | Populates `average_size_mm` and enables size-based grading. |
| Reference marker detected + Physical constant missing | `CALIBRATION_CONSTANT_REQUIRED` | `null` | Retains pixel dimensions; size-based grading operates in size-neutral mode. |
| No reference marker detected in scene | `NO_REFERENCE_OBJECT_DETECTED` | `null` | Retains pixel dimensions; raises `REVIEW_RECOMMENDED` advisory. |
| Marker detected but confidence $< 0.35$ or area $< 100$ px | `UNAVAILABLE` | `null` | Discards reference object; logs warning. |

---

## 5. Configuration & API Usage

Scale calibration can be configured globally in `backend/app/core/config.py`:
```python
REFERENCE_OBJECT_DIAMETER_MM: Optional[float] = 25.0  # e.g., standard Indian 1-rupee coin (25 mm)
```
Or provided dynamically per inspection request:
```http
POST /api/inspections?process=true&reference_diameter_mm=25.0
```
Or processed subsequently:
```http
POST /api/inspections/{inspection_id}/process?reference_diameter_mm=25.0
```

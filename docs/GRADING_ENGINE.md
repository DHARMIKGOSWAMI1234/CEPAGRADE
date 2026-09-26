# ONIONVISION — Deterministic Explainable Grading Engine

**Phase:** PHASE 04 — CV INTEGRATION & GRADING  
**Module:** `backend/app/services/grading_service.py`  
**Status:** IMPLEMENTED & TESTED  

---

## 1. Prototype Notice & Regulatory Disclaimer

> [!IMPORTANT]
> The ONIONVISION grading engine produces **system prototype grades** for technical evaluation and decision support. It does **not** claim to represent certified government standards, official NAFED standards, or statutory agricultural grading certificates. Commercial or statutory grading requires accredited human inspection and certified laboratory metrology.

---

## 2. Grading Inputs & Hierarchy

The grading engine consumes real, verified outputs from upstream computer vision modules:

1. **Physical Size (`size_mm`):** Physical equatorial diameter in millimeters (populated only when calibrated).
2. **Quality Health Class (`quality_class`):** Predicted by MobileNetV3-Small (`Healthy` vs `Unhealthy`).
3. **Defect Surface Area (`defect_area`):** Estimated visual defect percentage ($0.0\%$ for healthy, positive for unhealthy).
4. **Overall Confidence (`confidence`):** Combined segmentation and classification confidence score.

---

## 3. Grade Definitions & Tier Rules

| Grade Tier | Quality Class | Physical Size ($mm$) | Defect Area | Description |
|---|---|---|---|---|
| **Grade A** | `Healthy` | $45.0 \le \text{size} \le 75.0$ | $\le 5.0\%$ | Optimal market produce: sound health, uniform size, negligible blemishes. |
| **Grade B** | `Healthy` | $35.0 \le \text{size} < 45.0$ OR $75.0 < \text{size} \le 90.0$ | $\le 10.0\%$ | Good commercial grade: sound health with minor size variance or slight cosmetic blemish. |
| **Grade C** | `Healthy` | $< 35.0$ OR $> 90.0$ | $\le 20.0\%$ | Marginal grade: undersized or oversized bulbs with moderate surface defects. |
| **Reject** | `Unhealthy` | Any | $> 20.0\%$ | Non-commercial: visible disease, severe damage, or rot. |

### Handling Uncalibrated Dimensions
If scale calibration is unavailable (`size_mm` is `null`), the engine grades solely based on health classification and defect surface area, preventing false rejections while appending an explicit advisory reason.

---

## 4. Explainable Decision Traceability

Every graded onion produces transparent human-readable explanations. Examples of generated reasons:

- `"Healthy classification with high confidence."`
- `"Physical size (52.4 mm) falls in optimal Grade A range (45–75 mm)."`
- `"Physical size unavailable because calibration reference was not configured."`
- `"Grade reduced because health classification was Unhealthy."`
- `"Manual review recommended because segmentation confidence was below configured threshold."`

---

## 5. Batch Quality Aggregation

The batch analytics engine calculates:
- **Overall Quality Score ($0–100$):** Weighted composite based on grade distributions ($A: 100, B: 80, C: 50, \text{Reject}: 0$).
- **Defect Rate ($0–100\%$):** Percentage of bulbs classified as `Unhealthy` or graded `Reject`.
- **Grade Distribution:** Count and percentage in Grade A, B, C, and Reject.
- **Review Required Count:** Bulbs flagged for operator review due to low confidence or anomalous morphometry.

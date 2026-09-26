# ONIONVISION

**AI-Based Onion Quality Inspection & Automated Grading System**  
*Team:* **#THE #DEBUGGERS**  
*Target:* SIH 2026 Working Prototype  

---

## 1. Project Purpose

Manual post-harvest inspection of onions is labour-intensive, subjective, and prone to inconsistency across different inspectors, lighting environments, and inspection conditions. 

**ONIONVISION** is designed as a computer-vision-based automated inspection and explainable grading system. The system photographs onion batches, performs instance segmentation to isolate individual onions, extracts geometric measurements (size, contour, area), classifies visible quality/defect indicators supported by audited training data, computes an explainable prototype quality score, and provides batch analytics with traceable inspection reports.

> **Important Notice on Phase 01 Scope:**  
> In accordance with the Project Master Plan, Phase 01 establishes the **Backend Foundation and Machine Learning Architecture**. No models are trained in Phase 01, and no synthetic or fabricated predictions are produced. The actual ML model architectures and defect classes will be finalized during **Phase 02 (Dataset Audit)** and trained in **Phase 03 (ML Training)**.

---

## 2. System Architecture Overview

```
Frontend (React/TypeScript - Phase 06)
         │
         ▼
FastAPI Backend (REST API)
         │
         ├── InspectionService (Image validation, safe storage, ID generation)
         ├── Database Layer (SQLite + SQLAlchemy ORM)
         ├── GradingService (Deterministic explainable heuristics)
         └── ML Inference Pipeline (Adapters currently in MODEL_NOT_CONFIGURED state)
                  ├── SegmentationEngine (COCO instance segmentation - Phase 03)
                  ├── QualityEngine (Defect classification - Phase 03)
                  └── MeasurementModule (Pixel/calibrated metric sizing)
```

---

## 3. Project Setup & Local Installation

### Prerequisites
- Python 3.13 (or 3.11+)
- Git

### 1. Clone & Enter Project Directory
```bash
cd ONION
```

### 2. Set Up Virtual Environment
A virtual environment is configured under `backend/.venv`:
```bash
# Windows
python -m venv backend/.venv
.\backend\.venv\Scripts\activate

# Linux / macOS
python3 -m venv backend/.venv
source backend/.venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 4. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp backend/.env.example backend/.env
```

---

## 4. Running the Backend Server

Start the FastAPI application with Uvicorn:
```bash
# From workspace root
& "backend/.venv/Scripts/python.exe" -m uvicorn app.main:app --app-dir backend --reload --port 8000
```
Or directly from `backend/`:
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Once running:
- **Interactive OpenAPI Documentation (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Endpoint:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 5. Running Tests & Automated Verification

### Run Pytest Suite
```bash
& "backend/.venv/Scripts/python.exe" -m pytest backend/tests -v
```

### Run End-to-End Verification Script
```bash
& "backend/.venv/Scripts/python.exe" scripts/verify_phase01.py
```

---

## 6. API Endpoints Summary

| Method | Endpoint | Description | Status in Phase 01 |
|---|---|---|---|
| `GET` | `/api/health` | Service health status check | Active (200 OK) |
| `POST` | `/api/inspections` | Upload onion batch image & create inspection | Active (201 Created) |
| `GET` | `/api/inspections` | List inspection history (paginated) | Active (200 OK) |
| `GET` | `/api/inspections/{id}` | Retrieve full inspection details & metrics | Active (200 OK) |
| `GET` | `/api/inspections/{id}/results` | Retrieve individual onion results | Active (200 OK, empty list) |
| `GET` | `/api/inspections/{id}/report` | Retrieve inspection report status | Active (Boundary defined, scheduled for Phase 07) |

---

## 7. Current Limitations & Phase 01 Boundaries

1. **No AI Inference in Phase 01:** Model weights are not loaded. Calls to `SegmentationEngine` and `QualityEngine` return structured `MODEL_NOT_CONFIGURED` states rather than fabricating synthetic data.
2. **Nullable AI Fields:** Metrics such as `total_onions`, `average_size_mm`, `quality_score`, and `defect_rate` remain `null` on uploaded inspection records until inference is executed.
3. **No Certified Agricultural Grading Claims:** Grade outputs (`Grade A`, `Grade B`, `Grade C`, `Reject`) are prototype heuristics for demonstration and are not official agricultural certification grades.
4. **PDF Reports:** Report generation endpoint returns a structured `not_implemented` status pending Phase 07 reporting engine.
5. **Frontend:** React dashboard is scheduled for Phase 06 once real model outputs are finalized.

---

## 8. Implementation Roadmap

- [x] **Phase 01:** Backend Foundation + ML Architecture *(Completed)*
- [ ] **Phase 02:** Dataset Audit (Inspect COCO, Red & White, Bad Onion datasets; verify labels & splits)
- [ ] **Phase 03:** ML Training (Train segmentation and quality models; benchmark metrics)
- [ ] **Phase 04:** Vision & Measurement Pipeline (Contour extraction, pixel-to-mm calibration, crop isolation)
- [ ] **Phase 05:** Backend Integration (Link live model inference to inspection upload pipeline)
- [ ] **Phase 06:** Frontend Development (React + TypeScript dashboard and real-time inspector)
- [ ] **Phase 07:** Reports & Analytics (PDF report generator with verification QR code)
- [ ] **Phase 08:** Testing, Polish & SIH 2026 Presentation Package

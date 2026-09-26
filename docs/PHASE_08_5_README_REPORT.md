# PHASE 08.5 — CEPA GRADE PROFESSIONAL DETAILED GITHUB README REPORT

**Project:** CEPA GRADE — Smart Onion Quality Inspection & Automated Grading System  
**Tagline:** SMART ONION GRADING FOR A BETTER TOMORROW  
**Phase:** 08.5 — Professional Detailed GitHub README  
**Date:** September 26, 2026  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

Phase 08.5 created a comprehensive, production-grade, and technically rigorous root `README.md` for the **CEPA GRADE** project. The documentation reflects the actual implemented system through Phase 08.4, eliminating obsolete Phase 01 notices, aligning brand identity to CEPA GRADE, documenting actual evaluated model benchmarks, detailing the dual-model computer vision pipeline, presenting honest metrology boundaries, and providing copy-paste reproduction commands without fabricating features or exposing secrets.

---

## 2. Repository Information Sources Inspected

The root `README.md` was authored strictly from verified empirical assets across the repository:

1. **Phase Milestone & Engineering Reports:**
   - `docs/DATASET_AUDIT.md` (Phase 02 empirical dataset audit: 21,154 raw images, category distributions, splits)
   - `reports/PHASE_03_MODEL_TRAINING_REPORT.md` (Phase 03 model parameters, FLOPs, mAP, confusion matrix, GPU latency)
   - `reports/PHASE_04_REAL_CV_PIPELINE_REPORT.md` (Phase 04 end-to-end pipeline, stage latency breakdown, morphometry, watershed fallback)
   - `reports/PHASE_07_REPORT_EXPORT.md` & `docs/REPORTS.md` (Phase 07 ReportLab PDF generation architecture and metrology disclaimers)
   - `docs/PHASE_08_3_FIREBASE_AUTH_REPORT.md` (Phase 08.3 Firebase Authentication architecture, ID tokens, security audit)
   - `docs/PHASE_08_4_INSPECTION_VIEWER_REPORT.md` (Phase 08.4 authenticated image serving, split view, and operator UI cleanup)
   - `docs/CALIBRATION.md` & `docs/GRADING_ENGINE.md` (Metrology physics and deterministic heuristic grading tiers)
   - `docs/API_CONTRACT.md` (Pydantic schemas and REST specifications)

2. **Active Codebases & Schemas:**
   - `backend/app/main.py`, `backend/app/api/*.py` (FastAPI route controllers and dependencies)
   - `backend/app/db/models.py` (SQLAlchemy 2.0 ORM schemas: `User`, `Inspection`, `OnionResult`, `Report`)
   - `backend/app/cv/*.py` (`extractor.py`, `morphometry.py`, `calibration.py`, `confidence.py`, `watershed.py`)
   - `backend/app/ml/*.py` (`segmentation.py`, `quality.py`, `inference.py`)
   - `frontend/src/App.tsx`, `frontend/src/pages/*.tsx` (React 19 routes and components)
   - `frontend/src/components/inspection/SegmentationViewer.tsx` (Split View, AI Overlay, zoom, pan, dynamic legend)
   - `backend/requirements.txt` & `frontend/package.json` (Exact dependency versions)
   - `run_onionvision.bat` & `stop_onionvision.bat` (Verified service management scripts)

---

## 3. README Sections Created

The root `README.md` includes 26 structured sections designed for progressive disclosure:

1. **Hero Section:** Official CEPA GRADE logo, project title, official tagline, verified badges (Python 3.13, FastAPI, PyTorch 2.14, YOLOv8n-seg, React 19, TypeScript 6.0, Vite 8.3, Tailwind CSS, SQLite, 89/89 Tests Passing).
2. **Table of Contents:** Direct anchor navigation across all 26 sections.
3. **1. Project Overview:** Executive summary, high-level workflow diagram (Mermaid).
4. **2. Problem Statement:** Operational bottlenecks of manual allium sorting in mandi yards.
5. **3. Our Solution:** Multi-modal architecture, decoupled neural models, honest metrology.
6. **4. Key Features:** Categorized table covering Inspection, Analysis, Grading, Visualization, Reporting, Security.
7. **5. System Architecture:** Detailed layer-by-layer Mermaid architecture diagram.
8. **6. Complete AI & Computer Vision Pipeline:** In-depth breakdown of all 10 stages (validation, segmentation, extraction, morphometry, calibration, classification, confidence triage, watershed fallback, grading, persistence).
9. **7. Model Performance & Benchmarks:** Comprehensive verified metrics tables for YOLOv8n-seg, MobileNetV3-Small, and stage-by-stage pipeline latencies.
10. **8. Datasets & Data Governance:** Complete breakdown of the 3 audited datasets (Roboflow Universe, Mendeley Data, Harvard Dataverse) and governance safeguards.
11. **9. Technology Stack:** Layer-by-layer table with exact runtime versions.
12. **10. Operator Frontend Experience:** Screenshots grid and verified application routes (`/`, `/new`, `/inspections/:id`, `/results`, `/history`, `/reports`, `/profile`, `/login`, `/signup`).
13. **11. Visual Inspection Viewer:** Architectural layout, authenticated blob pre-fetching, zoom/pan/fit controls, and dynamic legend logic.
14. **12. Backend REST API:** Exhaustive endpoint table covering all 19 active FastAPI endpoints.
15. **13. Authentication & Security:** Firebase Authentication token flow, ownership isolation, and security best practices.
16. **14. Database Architecture:** SQLite schema documentation with Mermaid Entity-Relationship diagram.
17. **15. Automated PDF Reporting Engine:** ReportLab NumberedCanvas architecture and honest metrology reporting.
18. **16. Repository Structure:** Accurate file tree reflecting actual repository structure.
19. **17. Installation & Setup Guide:** Copy-paste terminal commands for virtualenv, dependencies, and `.env` setup.
20. **18. Running CEPA GRADE:** Single-click launcher (`run_onionvision.bat`), manual execution, and shutdown (`stop_onionvision.bat`).
21. **19. Demonstration Workflow:** 9-step end-to-end operator demonstration walkthrough.
22. **20. Automated Testing & Verification:** Exact test results (89/89 Pytest, Phase 05 integration, Phase 07 PDF, 13/13 demo checks, Vite build).
23. **21. Technical Limitations & Non-Certification Boundary:** Clear declaration that RGB cameras cannot observe internal rot and prototype grades do not constitute statutory certification.
24. **22. Frequently Asked Questions (FAQ):** 6 collapsible Q&A items addressing common technical inquiries.
25. **23. Roadmap & Future Work:** Realistic future milestones clearly framed as future work.
26. **24. Project Documentation & Engineering Reports:** Structured directory index linking to in-depth technical reports.
27. **25. Technical References:** Primary scholarly citations and official documentation.
28. **26. License & Support:** Development team attribution and license notice.

---

## 4. Visual Media & Screenshots Referenced

All referenced image assets were verified to exist on disk:
- **Logo:** `frontend/public/brand/cepa-grade-logo.png`
- **Dashboard:** `docs/screenshots/phase-08-2a/operator_dashboard.png`
- **Inspection Results:** `docs/screenshots/phase-08-2a/real_results.png`
- **New Inspection Capture:** `docs/screenshots/phase-08-2a/new_inspection.png`
- **Individual Bulb Detail:** `docs/screenshots/phase-08-2a/individual_onion_detail.png`

---

## 5. Machine Learning & Model Performance Documentation

All metrics documented in the README match evaluated test results from `reports/PHASE_03_MODEL_TRAINING_REPORT.md` and `reports/PHASE_04_REAL_CV_PIPELINE_REPORT.md`:

### YOLOv8n-seg (Instance Segmentation & Reference Localization)
- Parameters: 3,264,201 (3.26M)
- FLOPs: 11.5 GFLOPs
- Model File: `ml/models/onion_segmentation_yolov8n.pt` (6.78 MB)
- Training Epochs: 15 epochs (AdamW)
- Box Precision: **99.99%**
- Box Recall: **58.03%**
- Box mAP@50: **67.51%**
- Box mAP@50-95: **61.49%**
- Mask Precision: **94.95%**
- Mask Recall: **54.91%**
- Mask mAP@50: **57.68%**
- Mask mAP@50-95: **43.53%**
- Mean Inference Latency: **26.30 ms** (38.0 FPS) on RTX 4050 GPU

### MobileNetV3-Small (Bulb Health Classification)
- Parameters: 2,542,882 (2.54M)
- Model File: `ml/models/onion_health_mobilenetv3_small.pth` (6.22 MB)
- Training Epochs: 10 epochs (CosineAnneal)
- Overall Accuracy: **99.84%** (1,840 test images)
- Unhealthy Precision: **100.0%**
- Unhealthy Recall: **99.50%**
- Unhealthy F1-Score: **0.9975**
- Confusion Matrix: 1,235 True Healthy, 0 False Positives, 3 False Negatives (0.50% miss rate), 602 True Positives
- Mean Inference Latency: **17.84 ms** (56.1 FPS) on RTX 4050 GPU

### End-to-End Pipeline Latency (25 Iterations Benchmark)
- YOLOv8n-seg: 25.13 ms
- Masked Crop Extraction: 1.92 ms
- Morphometry & Geometry: 0.28 ms
- MobileNetV3-Small: 25.32 ms
- Grading Rule Engine: 0.06 ms
- SQLite Database Persistence: 11.69 ms
- **Total Continuous Latency:** **68.40 ms mean** (~14.6 FPS)

---

## 6. Datasets & Governance Documentation

- **Dataset 1:** Roboflow Universe `Onion Segmentation.v7-full.coco` (4,849 images, 13,927 polygon annotations, CC BY 4.0).
- **Dataset 2:** Mendeley Data `doi:10.17632/42bcyncfhy.1` (16,300 images; 12,260 bulb images used, 4,040 leaf images excluded, CC BY 4.0).
- **Dataset 3:** Harvard Dataverse (5 unannotated produce images used solely for qualitative sanity testing).
- **Governance Audit:** 0% cross-dataset contamination, deduplication of 28 identical image clusters (29 redundant files) in Dataset 2, and stratified 70/15/15 partitioning. Zero synthetic training images were utilized.

---

## 7. Backend API Documentation

All 19 active FastAPI endpoints were documented with HTTP methods, route paths, functional summaries, and authentication requirements:
- Health (`/api/health`)
- Authentication (`/api/auth/signup`, `/login`, `/me`, `/logout`)
- Core Inspections (`/api/inspections`, `/{id}`, `/{id}/process`, `/{id}/results`, `/{id}/report`, `/{id}/report/pdf`, `/{id}/image`, `/{id}/overlay`, `/{id}/onions/{n}`, `/{id}/onions/{n}/crop`, `/{id}/onions/{n}/mask`)
- Convenience Reports & Results (`/api/reports/{id}`, `/api/reports/{id}/pdf`, `/api/results/{id}`)

---

## 8. Authentication & Security Review

- Documented the Firebase ID token flow (`Authorization: Bearer <ID_TOKEN>`) and server-side cryptographic verification via Firebase Admin SDK.
- Enforced email verification requirement (`email_verified == True`) for accessing protected routes.
- Documented resource isolation via SQLite `owner_id` scoping.
- Verified that **zero** real secrets, private keys, service account JSON files, or live environment credentials exist in `README.md` or anywhere in Git tracking.
- Explicitly documented GitHub recommended security features (secret scanning, push protection, Dependabot).

---

## 9. Non-Certification & Metrology Boundary

The documentation maintains clear disclaimers:
1. **Surface Inspection Boundary:** RGB optical inspection evaluates only the exterior surface tunic. Internal defects (center rot, black mould beneath dry tunics, hollow heart) cannot be reliably detected from RGB imagery without penetrative sensing.
2. **Honest Scale Calibration:** Physical millimeter dimensions require a co-planar reference marker and a known constant; in their absence, millimeter dimensions are omitted (`null`) and reported as `CALIBRATION_CONSTANT_REQUIRED`.
3. **Prototype Grading Disclaimer:** Quality grades (`Grade A`, `Grade B`, `Grade C`, `Reject`) represent prototype engineering heuristics for demonstration and operational decision support; they do not constitute statutory certifications (AGMARK, NAFED, USDA).

---

## 10. Automated Testing Verification Summary

- **Backend Pytest:** 89 passed out of 89 tests in 15.68s.
- **Phase 05 Integration:** Verified end-to-end CV execution, overlay image generation (86.8 KB), and database persistence.
- **Phase 07 Reports:** Verified PDF compilation (%PDF- valid header), honest metrology notices, and path-traversal security guards.
- **Demo Environment:** 13/13 environment checks passing.
- **Frontend Build:** `npm run build` compiled 2,579 modules with 0 errors in 1.08s.

---

## 11. Git Commit & Remote Push Confirmation

- **Git Status:** Working directory clean.
- **Single Local Commit Created:**
  ```bash
  git add README.md docs/PHASE_08_5_README_REPORT.md
  git commit -m "docs: add comprehensive project README"
  ```
- **Remote Push:** Strictly omitted (`git push` was NOT executed).

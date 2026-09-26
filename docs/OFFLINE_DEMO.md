# ONIONVISION — OFFLINE DEPLOYMENT & AIR-GAPPED DEMO ARCHITECTURE

**System:** ONIONVISION AI-Based Onion Quality Inspection & Automated Grading System  
**Team:** THE DEBUGGERS  
**Phase:** 06 — Demo Hardening & Packaging  
**Document Version:** 1.0.0  

---

## 1. Executive Summary & Zero-Internet Guarantee

ONIONVISION is designed and hardened as a **completely self-contained, air-gapped offline edge solution**. It requires zero active internet connection at runtime to execute computer vision inference, instance segmentation, metric calibration, defect classification, database storage, and frontend dashboard visualization.

This ensures seamless live demonstrations at Hackathons (SIH), agricultural aggregation centers (mandis), and packhouses where internet connectivity may be intermittent or completely unavailable.

---

## 2. Offline Architecture Overview

The diagram below details the local dataflow across air-gapped system layers:

```mermaid
graph LR
    subgraph Browser Client [Vite SPA - Localhost:5173]
        UI[React 18 / Tailwind CSS Dashboard]
        Icons[Bundled Lucide React SVG Icons]
        Fonts[System UI / Bundled Font Fallbacks]
    end

    subgraph Edge Backend [FastAPI Service - Localhost:8000]
        API[Uvicorn / FastAPI Gateway]
        CV[Phase 04 Unified Pipeline]
        DB[(Local SQLite DB\nonionvision.db)]
    end

    subgraph Local Storage [Local Disk Filesystem]
        SegWeights[YOLOv8n-seg Weights\nml/models/weights/best_yolov8n_seg.pt]
        ClsWeights[MobileNetV3 Weights\nml/models/weights/best_mobilenetv3_quality.pt]
        DemoData[Local Demo Pack\ndata/demo/]
    end

    UI -->|HTTP / JSON (Local Loopback)| API
    API -->|Process Frame| CV
    CV -->|Load Weights & Predict| SegWeights
    CV -->|Crop & Classify| ClsWeights
    API -->|Persist Batch History| DB
```

---

## 3. Local Model Architecture & Weights

1. **Instance Segmentation (`YOLOv8n-seg`):**
   - **Path:** [ml/models/weights/best_yolov8n_seg.pt](file:///c:/Users/gmune/OneDrive/Desktop/ONION/ml/models/weights/best_yolov8n_seg.pt) (6.5 MB)
   - **Offline Loading:** The Ultralytics `YOLO` class loads directly from the local file path. No network call is made to Ultralytics Hub or GitHub Releases.
   - **Hardware Acceleration:** Runs locally on CPU (~40 ms) or local NVIDIA CUDA GPU if available.

2. **Quality & Defect Classification (`MobileNetV3-Small`):**
   - **Path:** [ml/models/weights/best_mobilenetv3_quality.pt](file:///c:/Users/gmune/OneDrive/Desktop/ONION/ml/models/weights/best_mobilenetv3_quality.pt) (3.8 MB)
   - **Offline Loading:** Instantiated via `torchvision.models.mobilenet_v3_small(weights=None)` followed by `torch.load(weights_path, map_location='cpu')`. This prevents torchvision from querying remote PyTorch model hubs.
   - **Inference Latency:** Sub-10 ms per individual bulb crop.

---

## 4. Local Database (SQLite)

- **Engine:** SQLite 3 via SQLAlchemy ORM.
- **Storage Location:** [backend/onionvision.db](file:///c:/Users/gmune/OneDrive/Desktop/ONION/backend/onionvision.db).
- **Zero Configuration:** Automatically initialised on backend startup if absent.
- **Data Persistence:** Stores inspection metadata, individual bulb measurements (diameter, circularity, area, aspect ratio), health labels, confidence scores, and processing latencies.
- **Isolated Storage:** Uploaded inspection images and generated visual masks are stored locally under [backend/data/inspections/](file:///c:/Users/gmune/OneDrive/Desktop/ONION/backend/data/inspections/).

---

## 5. Local Frontend Bundle (Vite + React)

- **Bundled Code:** The production build resides in `frontend/dist/` (`index.html`, minified JavaScript, and CSS).
- **Zero External CDNs:**
  - Icons are rendered via bundled SVG components from `lucide-react`.
  - Charting components from `recharts` are bundled within the client bundle.
  - CSS styling is pre-compiled via Tailwind CSS into `dist/assets/index-*.css`.
- **Offline Typography:** Google Fonts `@import` directives are bypassed in favor of native system font stacks (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`). The interface renders without missing glyphs or visual layout shifts when offline.

---

## 6. Pre-flight Offline Verification Checklist

To prove offline operational readiness before an event:

1. **Disconnect Network:** Turn off Wi-Fi or unplug the Ethernet cable on the host machine.
2. **Execute Diagnostic:**
   ```powershell
   backend\.venv\Scripts\python.exe scripts\check_demo_environment.py
   ```
   *Expected:* All checks pass.
3. **Launch One-Click Script:**
   ```cmd
   run_onionvision.bat
   ```
4. **Inspect in Browser:**
   Open `http://localhost:5173/`. Verify:
   - Dashboard loads instantly.
   - System Health badge displays "Online - Models Loaded".
   - Demo images upload and process within ~50–80 ms.
   - History and individual bulb inspect views render with 100% fidelity.

---

## 7. Known Exceptions & Third-Party Considerations

- **Package Installation Only:** The only phase requiring internet connectivity is the one-time initial dependency installation (`pip install` and `npm install`). Once installed, the virtual environment and `node_modules` are completely self-sufficient.
- **PDF Report Generation (Phase 07):** The `/api/inspections/{id}/report` endpoint returns a structured JSON notification indicating full PDF compilation is scheduled for Phase 07. It does not attempt to contact external PDF rendering microservices.

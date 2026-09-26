# ONIONVISION — Frontend Application

## Overview
**ONIONVISION** is an AI-based agricultural onion quality inspection and automated grading system developed for the Smart India Hackathon by **THE DEBUGGERS**.

This frontend is a React + TypeScript + Vite single-page application built to interface with the FastAPI computer-vision backend. It displays real-time results from the CEPA-inspired CV pipeline without any fabricated or mock data.

---

## Technology Stack
- **Framework:** React 19 + TypeScript
- **Bundler / Dev Server:** Vite
- **Styling:** Tailwind CSS + PostCSS + Autoprefixer
- **Routing:** React Router v7 (`react-router-dom`)
- **API Client:** Axios (proxied to `http://127.0.0.1:8000`)
- **Charts:** Recharts (Grade distribution, Quality breakdown, Size histogram)
- **Icons:** Lucide React

---

## Project Structure
```
frontend/
├── public/                 # Static assets and icons
├── src/
│   ├── api/
│   │   ├── client.ts       # Axios instance and asset URL resolution
│   │   ├── inspections.ts  # Typed API endpoints (health, upload, execute, query)
│   │   └── types.ts        # TypeScript mirrors of backend Pydantic models
│   ├── components/
│   │   ├── charts/         # GradeDistribution, QualityDistribution, SizeDistribution
│   │   ├── common/         # Button, Badge, Card, EmptyState, Loading, ErrorState
│   │   ├── dashboard/      # StatCard, RecentInspections
│   │   ├── inspection/     # UploadZone, InspectionProgress, SegmentationViewer, OnionCard, OnionGrid, InspectionSummary, ConfidenceBadge
│   │   └── layout/         # Sidebar, Header, PageContainer
│   ├── hooks/
│   │   ├── useInspection.ts  # Single inspection fetching and polling hook
│   │   └── useInspections.ts # Inspection list and live statistics aggregator
│   ├── pages/
│   │   ├── Dashboard.tsx          # Main overview with real metrics and charts
│   │   ├── History.tsx            # Searchable and filterable inspection history
│   │   ├── InspectionAnalysis.tsx # 9-stage CEPA pipeline progress monitor
│   │   ├── InspectionResults.tsx  # Hero summary, segmentation overlay, and onion grid
│   │   ├── NewInspection.tsx      # Drag-and-drop batch image upload and scale config
│   │   ├── OnionDetail.tsx        # Morphometry breakdown and crop/mask comparison
│   │   └── Report.tsx             # Formal inspection report preview with Print to PDF
│   ├── utils/
│   │   ├── formatters.ts   # Date, percentage, mm, and score formatters
│   │   └── grading.ts      # Visual badges and color styling helpers
│   ├── App.tsx             # Root router and layout configuration
│   ├── index.css           # Tailwind directives and print stylesheet
│   └── main.tsx            # React application entry point
├── .env.example
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Installation & Running Locally

### Prerequisites
- Node.js (v18+)
- Python 3.10+ (with backend virtualenv initialized)

### 1. Start the FastAPI Backend
From project root:
```bash
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```
Backend health check: `http://127.0.0.1:8000/api/health`

### 2. Start the Frontend Development Server
From `frontend/` directory:
```bash
npm install
npm run dev
```
Open browser at: `http://localhost:5173/`

### 3. Build for Production
```bash
npm run build
```
Production assets are output to `frontend/dist/`.

---

## Environment Variables
Configured in `frontend/.env`:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```
If omitted, Vite development server automatically proxies `/api` requests to `http://127.0.0.1:8000`.

---

## Core Features & Demonstration Flow
1. **Live Dashboard (`/`):**
   - Displays real statistics calculated from SQLite database records.
   - Real-time connection and model readiness status in sidebar.
   - Grade and Quality distribution charts powered by Recharts.
2. **New Inspection (`/new`):**
   - Drag-and-drop image upload with client-side format and dimension validation.
   - Configurable reference object diameter (default 25.0 mm).
3. **Segmentation Viewer (`/inspections/:id/results`):**
   - Interactive zoom, fit-to-screen, and view switching.
   - Color-coded overlay: Magenta for Red Onions, Amber for Yellow Onions, Cyan for Reference Discs, and Crimson for Unhealthy instances.
4. **Individual Onion Morphometry (`/inspections/:id/onions/:num`):**
   - Precision comparison between bounding-box crop and isolated masked bulb.
   - Comprehensive geometric measurements: Area, Perimeter, Equivalent Diameter, Aspect Ratio, Circularity, Major/Minor Axes.
   - Strict distinction between image pixels and calibrated physical millimetres.
5. **Inspection Report (`/inspections/:id/report`):**
   - Printable document preview with batch summary, metrics, and technical limitations.
   - Direct browser Print-to-PDF support (`window.print()`).

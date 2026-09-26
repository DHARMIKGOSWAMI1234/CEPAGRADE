# ONIONVISION — UI/UX Design System Specification
**Product:** AI-Based Onion Quality Inspection & Automated Grading System  
**Team:** THE DEBUGGERS  
**Release:** Phase 08 — Complete UI/UX Redesign (SIH-Demo-Ready)

---

## 1. Design Philosophy

ONIONVISION is designed as a serious **commercial computer-vision inspection workstation** rather than a generic web dashboard, student CRUD demo, or flashy cyberpunk AI prototype.

### Core Tenets:
1. **Operator-First Ergonomics:**  
   Quality control supervisors and packhouse sorting operators must instantly understand the inspection state without consulting an operator manual. Key decisions (pass, triage, calibrate, reject) are immediate and unambiguous.
2. **Technical & Agricultural Authenticity:**  
   Visual tones blend industrial inspection precision (graphite, slate, high-contrast monospace readings) with agricultural intelligence (deep forest green, emerald, warm slate).
3. **Calm & Trustworthy:**  
   Avoids eye-fatiguing neon gradients, distracting floating blobs, or gratuitous 3D models. The interface prioritizes clarity, calm focus, and optical data fidelity.
4. **Metrological Integrity:**  
   Physical dimensions (millimetres) and optical grid units (pixels) are never conflated. Model softmax certainty is honestly designated as "Model Confidence", never conflated with empirical validation accuracy.

---

## 2. Color Palette & Semantic Tokens

The design system employs a tailored HSL-based palette configured natively in Tailwind CSS and synchronized across Light and Dark themes via CSS variables.

### Primary Palette Tokens:

| Token | Light Value | Dark Value | Purpose |
| :--- | :--- | :--- | :--- |
| **Forest 900** | `#064e3b` | `#022c22` | Hero banners, primary header branding |
| **Emerald 600** | `#059669` | `#10b981` | Primary CTA, healthy bulbs, Grade A, validated gates |
| **Slate 50** | `#f8fafc` | `#020617` | Canvas background |
| **Slate 850** | `#1e293b` | `#0f172a` | Card surfaces, modal paper, sidebar backdrop |
| **Slate 950** | `#020617` | `#020617` | Image viewer surface, terminal contrast background |

### Semantic Status Indicators:

```css
/* Healthy / Grade A / Verified */
--color-status-success: #059669; /* Emerald */

/* Warning / Review Required / Grade C */
--color-status-warning: #d97706; /* Amber */

/* Unhealthy / Reject / System Error */
--color-status-danger: #e11d48; /* Rose */

/* Neutral / Secondary Info / Grade B */
--color-status-info: #2563eb; /* Blue */
```

### Optical Segmentation Reticle Palette:
- **Red Onion Mask:** `#c026d3` (Fuchsia-600)
- **Yellow Onion Mask:** `#d97706` (Amber-600)
- **Reference Calibration Disc:** `#0891b2` (Cyan-600)
- **Defect / Surface Blemish:** `#e11d48` (Rose-600)

---

## 3. Typography & Numerical Precision

The type system is built on modern system sans-serif font stacks (`Inter`, `system-ui`, `-apple-system`) prioritizing rapid optical readability.

### Type Scale:

| Level | Size / Line-Height | Weight | Usage |
| :--- | :--- | :--- | :--- |
| **Display** | 32–36px / 1.2 | ExtraBold (800) | Hero assessment headings |
| **Page Title** | 24–28px / 1.25 | Bold (700) | Primary view title |
| **Section Title** | 16–18px / 1.3 | SemiBold (600) | Module and grid section labels |
| **Body Standard** | 14–15px / 1.5 | Normal (400) | Contextual explanations, instructions |
| **Caption / Meta** | 11–12px / 1.4 | Medium (500) | Metadata timestamps, table subheaders |
| **Technical Metric** | 20–32px / 1.1 | Black (900), Tabular | KPI numbers, quality scores, mm diameters |

### Numerical Alignment:
All technical measurements, area pixels, millimeter diameters, and confidence percentages utilize CSS `tabular-nums` and monospace styling (`font-mono`) to prevent visual jitter and preserve vertical tabular alignment across comparative rows.

---

## 4. Layout Architecture & Navigation

The layout follows a persistent sidebar shell with responsive header and collapsible mobile navigation:

```
┌──────────────────────────────────────────────────────────┐
│ [LOGO] ONIONVISION                 ● System Online  [New] │
├──────────────┬───────────────────────────────────────────┤
│              │                                           │
│ Overview     │                                           │
│ New Scan     │              PAGE CONTENT                 │
│ History      │                                           │
│ Reports      │                                           │
│              │                                           │
│ ──────────── │                                           │
│ System Ready │                                           │
│ [Theme] [Ver]│                                           │
└──────────────┴───────────────────────────────────────────┘
```

### Core Views:
1. **Overview (`/`):** Strategic operations dashboard with live KPI cards, health status, quality/grade distributions, and recent batch activity.
2. **New Scan (`/new`):** 3-step inspection execution portal (Image Selection → Physical Calibration → Deep Vision Execution).
3. **Pipeline Progress (`/inspections/:id`):** 9-stage verified timeline showing real execution status across all CV modules.
4. **Inspection Results (`/inspections/:id/results`):** Split-view optical inspection reticle, batch intelligence analytics, operator triage queue, and individual onion card grid.
5. **Individual Onion Detail (`/inspections/:id/onions/:num`):** Dual-crop inspection report (RGB crop vs isolated mask), triple confidence breakdown, calibrated mm vs sensor pixel geometry, and transparent "Why This Grade?" reasoning.
6. **History (`/history`):** Traceable batch ledger with multi-column filtering, search, and date ordering.
7. **Reports (`/reports`):** Central report portal listing generated ReportLab PDF documents with instant download and preview triggers.
8. **Report Document (`/inspections/:id/report`):** Standardized, printable inspection certificate with complete metrology traceability.

---

## 5. Reusable Component Library

The application defines a unified component library under `frontend/src/components/common/`:

- **`Logo`:** Pure CSS/SVG concentric onion bulb combined with optical scanner crosshairs. Zero external font or image asset dependencies.
- **`ThemeToggle`:** Instant light/dark mode switch synchronized to `localStorage` and `document.documentElement` `.dark` class.
- **`Button`:** 5 semantic variants (`primary`, `secondary`, `outline`, `ghost`, `danger`) with interactive scale microinteraction (`active:scale-95`).
- **`Card`:** Padded, rounded-2xl surface supporting titles, subtitles, action slots, hover elevation, and brand highlights.
- **`Badge`:** Color-coded status chip with live pulse dot options (`emerald`, `amber`, `rose`, `blue`, `slate`).
- **`StatusIndicator`:** Live system heartbeat pill with pulsing halo indicators.
- **`MetricCard`:** Technical KPI display component featuring oversized tabular numbers, contextual metadata, and variant accent cards.
- **`ConfidenceMeter`:** Triple-tier evidence visualizer (Segmentation, Health, Composite) with explicit metrological disclaimers.
- **`SegmentationViewer`:** Commercial dual-mode image viewer supporting side-by-side Split View (Raw vs Mask), AI Overlay toggle, Zoom In/Out, Fit-to-screen, and dynamic class legends.
- **`OnionCard`:** Individual produce instance card displaying thumbnail crop, grade badge, health indicator, physical mm size, and review status.

---

## 6. Metrological and Operator Safeguards

1. **Clear Pixel vs Millimeter Distinction:**  
   When a calibration reference is missing or uncalibrated, physical millimeter values display `"Calibration required"` rather than fabricating estimates. Geometry values remain accessible in exact sensor pixels.
2. **Operator Review Queue:**  
   Any onion exhibiting confidence below 75% or geometric anomalies is automatically surfaced in the prominent `"Needs Review"` queue with suggested corrective action.
3. **No Fabricated Performance:**  
   The UI renders solely real inspection counts, real batch quality indices, real model weights readiness, and genuine ReportLab PDF file sizes.

---

## 7. Accessibility (A11y) Conformance

- **Color Independence:** All status pills pair semantic colors with distinct icons (checkmarks, alert triangles, shield icons) and explicit text labels.
- **Contrast Ratios:** Text and critical UI boundaries satisfy WCAG 2.1 AA requirements (minimum 4.5:1 for body copy, 3:1 for large headers).
- **Keyboard Navigation:** Full focus ring visibility (`focus:ring-2 focus:ring-emerald-500`) across all interactive buttons, selects, and links.
- **Semantic Structure:** Single `<h1>` per view, sequential `<h2>`/`<h3>` section hierarchy, and semantic data tables with descriptive column headers.

"""
ONIONVISION — Professional Technical Inspection Report Generator (PDF)
Phase 07: ReportLab-based deterministic, offline-capable PDF export.
Conforms to Master Plan Section 18 and Phase 07 Technical Specification.
"""

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.config import settings
from app.db.models import Inspection, OnionResult


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that accumulates total page count and prints
    standard technical headers and footers on every page.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._saved_page_states: List[Dict[str, Any]] = []
        self.doc_inspection_id: str = ""

    def showPage(self) -> None:
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int) -> None:
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header for page 2 and onwards
        if self._pageNumber > 1:
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, 756, 576, 756)
            self.drawString(36, 762, "ONIONVISION — AI-Based Onion Quality Inspection Report")
            insp_text = f"Ref: {self.doc_inspection_id}" if self.doc_inspection_id else ""
            self.drawRightString(576, 762, insp_text)

        # Footer on all pages
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 36, 576, 36)
        self.drawString(
            36,
            24,
            "ONIONVISION Technical Inspection System • For Prototype Assistance Only • No Statutory Certification",
        )
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 24, page_str)
        self.restoreState()


class PDFReportGenerator:
    """Generates comprehensive, multi-page technical inspection PDF reports."""

    def __init__(self) -> None:
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self) -> None:
        """Configures typography, colors, and leading for technical document layout."""
        self.styles.add(
            ParagraphStyle(
                name="DocTitle",
                fontName="Helvetica-Bold",
                fontSize=20,
                leading=24,
                textColor=colors.HexColor("#065f46"),
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="DocSubtitle",
                fontName="Helvetica",
                fontSize=10,
                leading=14,
                textColor=colors.HexColor("#475569"),
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="DocMetaLabel",
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=11,
                textColor=colors.HexColor("#64748b"),
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="DocMetaValue",
                fontName="Helvetica",
                fontSize=9,
                leading=12,
                textColor=colors.HexColor("#0f172a"),
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="SectionHeading",
                fontName="Helvetica-Bold",
                fontSize=12,
                leading=16,
                textColor=colors.HexColor("#0f172a"),
                spaceBefore=10,
                spaceAfter=4,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="SectionSubheading",
                fontName="Helvetica-Bold",
                fontSize=10,
                leading=13,
                textColor=colors.HexColor("#065f46"),
                spaceBefore=6,
                spaceAfter=2,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="BodyDark",
                fontName="Helvetica",
                fontSize=8.5,
                leading=11.5,
                textColor=colors.HexColor("#1e293b"),
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="BodyMuted",
                fontName="Helvetica",
                fontSize=8,
                leading=11,
                textColor=colors.HexColor("#64748b"),
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="StatLabel",
                fontName="Helvetica-Bold",
                fontSize=7.5,
                leading=10,
                textColor=colors.HexColor("#64748b"),
                alignment=1,  # Center
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="StatValue",
                fontName="Helvetica-Bold",
                fontSize=14,
                leading=17,
                textColor=colors.HexColor("#065f46"),
                alignment=1,  # Center
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="StatValueRose",
                fontName="Helvetica-Bold",
                fontSize=14,
                leading=17,
                textColor=colors.HexColor("#b91c1c"),
                alignment=1,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="StatValueNavy",
                fontName="Helvetica-Bold",
                fontSize=14,
                leading=17,
                textColor=colors.HexColor("#0f172a"),
                alignment=1,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="TableHeader",
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=10,
                textColor=colors.HexColor("#1e293b"),
                alignment=0,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="TableCell",
                fontName="Helvetica",
                fontSize=8,
                leading=10.5,
                textColor=colors.HexColor("#334155"),
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="TableCellBold",
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=10.5,
                textColor=colors.HexColor("#0f172a"),
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="CalloutText",
                fontName="Helvetica",
                fontSize=8,
                leading=11,
                textColor=colors.HexColor("#334155"),
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="CalloutAlert",
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=11,
                textColor=colors.HexColor("#991b1b"),
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="ReasonBullet",
                fontName="Helvetica",
                fontSize=7.5,
                leading=10,
                textColor=colors.HexColor("#475569"),
            )
        )

    def _safe_image_flowable(self, image_path: Optional[str], max_w: float, max_h: float) -> Optional[RLImage]:
        """Loads and proportionally constrains an image for ReportLab flowables."""
        if not image_path:
            return None
        p = Path(image_path).resolve()
        if not p.exists() or not p.is_file():
            return None
        try:
            with PILImage.open(p) as img:
                orig_w, orig_h = img.size
            if orig_w <= 0 or orig_h <= 0:
                return None
            scale = min(max_w / orig_w, max_h / orig_h, 1.0)
            target_w = orig_w * scale
            target_h = orig_h * scale
            return RLImage(str(p), width=target_w, height=target_h)
        except Exception:
            return None

    def _parse_calibration(self, inspection: Inspection) -> Dict[str, Any]:
        """Extracts verified calibration metadata dictionary."""
        if getattr(inspection, "calibration_json", None):
            try:
                return json.loads(inspection.calibration_json)
            except Exception:
                pass
        return {
            "status": "UNCALIBRATED",
            "reference_detected": False,
            "pixels_per_mm": None,
            "notes": "No calibration record available.",
        }

    def _format_datetime(self, dt: Optional[datetime]) -> str:
        """Formats datetime to clear ISO-like UTC timestamp."""
        if not dt:
            return "N/A"
        return dt.strftime("%Y-%m-%d %H:%M:%S UTC")

    def build_report_pdf(self, inspection: Inspection, output_path: Path) -> Path:
        """
        Builds the complete multi-page PDF inspection report.
        output_path: Path to target PDF file.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)

        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=44,
        )

        calib = self._parse_calibration(inspection)
        calibrated = (
            calib.get("status") in ["CALIBRATED", "ESTIMATED"]
            and calib.get("pixels_per_mm") is not None
            and float(calib.get("pixels_per_mm") or 0) > 0
        )

        onions = list(inspection.onions)
        total_onions = inspection.total_onions if inspection.total_onions is not None else len(onions)
        healthy_count = sum(1 for o in onions if o.quality_class == "Healthy")
        unhealthy_count = sum(1 for o in onions if o.quality_class == "Unhealthy")
        defect_rate = (
            inspection.defect_rate
            if inspection.defect_rate is not None
            else ((unhealthy_count / total_onions * 100) if total_onions > 0 else 0.0)
        )
        quality_score = inspection.quality_score if inspection.quality_score is not None else 0.0

        # Grade distribution tally
        grade_dist = {"Grade A": 0, "Grade B": 0, "Grade C": 0, "Reject": 0}
        for o in onions:
            g = o.grade or "Grade C"
            if g in grade_dist:
                grade_dist[g] += 1
            else:
                grade_dist["Grade C"] += 1

        story: List[Any] = []

        # =========================================================================
        # PAGE 1: HEADER & METADATA
        # =========================================================================
        header_table_data = [
            [
                Paragraph("<b>ONIONVISION</b>", self.styles["DocTitle"]),
                Paragraph(
                    f"<b>REPORT REF:</b> {inspection.inspection_id}<br/>"
                    f"<b>DATE:</b> {self._format_datetime(inspection.completed_at or inspection.created_at)}<br/>"
                    f"<b>STATUS:</b> <font color='#065f46'><b>{inspection.status.upper()}</b></font>",
                    self.styles["DocMetaValue"],
                ),
            ],
            [
                Paragraph(
                    "<b>AI-Based Onion Quality Inspection & Automated Grading Report</b><br/>"
                    "<font color='#64748b'>SIH Technical Produce Evaluation • Team: THE DEBUGGERS</font>",
                    self.styles["DocSubtitle"],
                ),
                Paragraph(
                    f"<b>SOURCE FILE:</b> {Path(inspection.image_path).name if inspection.image_path else 'N/A'}<br/>"
                    f"<b>CALIBRATION:</b> {'CALIBRATED' if calibrated else 'UNCALIBRATED'}",
                    self.styles["DocMetaValue"],
                ),
            ],
        ]
        header_table = Table(header_table_data, colWidths=[330, 210])
        header_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                ]
            )
        )
        story.append(header_table)
        story.append(Spacer(1, 4))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#065f46"), spaceAfter=10))

        # =========================================================================
        # PAGE 1: BATCH QUALITY SUMMARY CARDS
        # =========================================================================
        story.append(Paragraph("1. Executive Batch Inspection Summary", self.styles["SectionHeading"]))
        story.append(Spacer(1, 4))

        avg_size_str = f"{inspection.average_size_mm:.1f} mm" if (calibrated and inspection.average_size_mm) else "Uncalibrated"
        health_ratio_str = f"{healthy_count} / {total_onions}"

        summary_cards_data = [
            [
                Paragraph("TOTAL ONIONS", self.styles["StatLabel"]),
                Paragraph("QUALITY SCORE", self.styles["StatLabel"]),
                Paragraph("HEALTHY BULBS", self.styles["StatLabel"]),
                Paragraph("DEFECT RATE", self.styles["StatLabel"]),
                Paragraph("AVG SIZE", self.styles["StatLabel"]),
            ],
            [
                Paragraph(str(total_onions), self.styles["StatValueNavy"]),
                Paragraph(f"{quality_score:.1f} / 100", self.styles["StatValue"]),
                Paragraph(health_ratio_str, self.styles["StatValue"]),
                Paragraph(f"{defect_rate:.1f}%", self.styles["StatValueRose"] if defect_rate > 0 else self.styles["StatValue"]),
                Paragraph(avg_size_str, self.styles["StatValueNavy"]),
            ],
        ]
        summary_table = Table(summary_cards_data, colWidths=[108, 108, 108, 108, 108])
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("TOPPADDING", (0, 0), (-1, 0), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
                    ("TOPPADDING", (0, 1), (-1, 1), 2),
                    ("BOTTOMPADDING", (0, 1), (-1, 1), 6),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        story.append(summary_table)
        story.append(Spacer(1, 10))

        # =========================================================================
        # PAGE 1: GRADE DISTRIBUTION TABLE
        # =========================================================================
        story.append(Paragraph("2. Prototype Grade Distribution Breakdown", self.styles["SectionHeading"]))
        story.append(Spacer(1, 4))

        def _pct(c: int) -> str:
            return f"{(c / total_onions * 100):.1f}%" if total_onions > 0 else "0.0%"

        grade_table_data = [
            [
                Paragraph("Grade Tier", self.styles["TableHeader"]),
                Paragraph("Count", self.styles["TableHeader"]),
                Paragraph("Share", self.styles["TableHeader"]),
                Paragraph("Commercial Standard Description", self.styles["TableHeader"]),
            ],
            [
                Paragraph("<b>Grade A</b> (Premium)", self.styles["TableCellBold"]),
                Paragraph(str(grade_dist["Grade A"]), self.styles["TableCell"]),
                Paragraph(_pct(grade_dist["Grade A"]), self.styles["TableCell"]),
                Paragraph("Sound health, uniform size (45–75 mm when calibrated), negligible surface defect (&le;5%).", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Grade B</b> (Commercial)", self.styles["TableCellBold"]),
                Paragraph(str(grade_dist["Grade B"]), self.styles["TableCell"]),
                Paragraph(_pct(grade_dist["Grade B"]), self.styles["TableCell"]),
                Paragraph("Good commercial quality, minor size variance (35–45 or 75–90 mm), minor blemishes (&le;10%).", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Grade C</b> (Marginal)", self.styles["TableCellBold"]),
                Paragraph(str(grade_dist["Grade C"]), self.styles["TableCell"]),
                Paragraph(_pct(grade_dist["Grade C"]), self.styles["TableCell"]),
                Paragraph("Marginal quality, undersized (&lt;35 mm), oversized (&gt;90 mm), or moderate blemishes (&le;20%).", self.styles["TableCell"]),
            ],
            [
                Paragraph("<font color='#b91c1c'><b>Reject</b> (Unsound)</font>", self.styles["TableCellBold"]),
                Paragraph(str(grade_dist["Reject"]), self.styles["TableCell"]),
                Paragraph(_pct(grade_dist["Reject"]), self.styles["TableCell"]),
                Paragraph("Severe visible rot, extensive surface decay (&gt;20%), or major pathological defects.", self.styles["TableCell"]),
            ],
        ]
        grade_table = Table(grade_table_data, colWidths=[120, 50, 60, 310])
        grade_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        story.append(grade_table)
        story.append(Spacer(1, 10))

        # =========================================================================
        # PAGE 1: SCALE CALIBRATION SECTION
        # =========================================================================
        story.append(Paragraph("3. Metrology & Physical Scale Calibration", self.styles["SectionHeading"]))
        story.append(Spacer(1, 4))

        ref_detected = calib.get("reference_detected", False)
        px_per_mm = calib.get("pixels_per_mm")
        px_per_mm_str = f"{float(px_per_mm):.2f} px/mm" if px_per_mm else "N/A"
        mm_per_px = calib.get("mm_per_pixel")
        mm_per_px_str = f"{float(mm_per_px):.4f} mm/px" if mm_per_px else "N/A"
        ref_std = calib.get("known_reference_mm") or calib.get("reference_diameter_mm")
        ref_std_str = f"{float(ref_std):.1f} mm standard" if ref_std else "None provided"

        calib_table_data = [
            [
                Paragraph("<b>Calibration State:</b>", self.styles["DocMetaLabel"]),
                Paragraph(str(calib.get("status", "UNCALIBRATED")), self.styles["TableCellBold"]),
                Paragraph("<b>Ref Marker Detected:</b>", self.styles["DocMetaLabel"]),
                Paragraph("YES (Localized in scene)" if ref_detected else "NO (Marker absent)", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Known Reference Std:</b>", self.styles["DocMetaLabel"]),
                Paragraph(ref_std_str, self.styles["TableCell"]),
                Paragraph("<b>Scale Factor:</b>", self.styles["DocMetaLabel"]),
                Paragraph(f"{px_per_mm_str} ({mm_per_px_str})", self.styles["TableCell"]),
            ],
        ]
        calib_table = Table(calib_table_data, colWidths=[120, 150, 120, 150])
        calib_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(calib_table)
        story.append(Spacer(1, 4))

        # Explicit Calibration Notice Box
        if calibrated:
            notice_p = Paragraph(
                "<b>CALIBRATED PHYSICAL MEASUREMENT:</b> Metric millimetre values are calculated using verified "
                f"planar reference calibration ({px_per_mm_str}). Absolute measurements are valid under co-planar camera positioning.",
                self.styles["CalloutText"],
            )
            notice_bg = colors.HexColor("#ecfdf5")
            notice_border = colors.HexColor("#10b981")
        else:
            notice_p = Paragraph(
                "<b>PIXEL MEASUREMENT ONLY:</b> Physical measurements unavailable — reference-object calibration required. "
                "No reference standard disc was verified; millimeter dimensions are omitted to prevent metric fabrication.",
                self.styles["CalloutAlert"],
            )
            notice_bg = colors.HexColor("#fef2f2")
            notice_border = colors.HexColor("#ef4444")

        notice_box = Table([[notice_p]], colWidths=[540])
        notice_box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), notice_bg),
                    ("BOX", (0, 0), (-1, -1), 1, notice_border),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(notice_box)
        story.append(Spacer(1, 10))

        # =========================================================================
        # PAGE 1: SEGMENTATION OVERLAY (WHERE PRACTICAL)
        # =========================================================================
        overlay_path = getattr(inspection, "overlay_path", None)
        if not overlay_path:
            cand = settings.upload_path / f"{inspection.inspection_id}_overlay.jpg"
            if cand.exists():
                overlay_path = str(cand)

        overlay_img = self._safe_image_flowable(overlay_path, max_w=480, max_h=210)
        if overlay_img:
            story.append(Paragraph("4. Computer Vision Segmentation Overlay", self.styles["SectionHeading"]))
            story.append(Spacer(1, 3))
            overlay_table = Table([[overlay_img]], colWidths=[540])
            overlay_table.setStyle(
                TableStyle(
                    [
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            story.append(overlay_table)

        # =========================================================================
        # PAGE 2+: INDIVIDUAL ONION RESULTS
        # =========================================================================
        story.append(PageBreak())
        story.append(Paragraph("5. Individual Onion Detection & Morphometry Records", self.styles["SectionHeading"]))
        story.append(
            Paragraph(
                "Detailed inspection record for each localized onion instance, including neural classification confidence, "
                "morphological parameters, and deterministic grading rationale.",
                self.styles["BodyMuted"],
            )
        )
        story.append(Spacer(1, 8))

        if not onions:
            story.append(
                Paragraph(
                    "<i>No individual onion instances detected or inspection pending completion.</i>",
                    self.styles["BodyDark"],
                )
            )
        else:
            for idx, onion in enumerate(onions):
                onion_block = self._build_onion_result_block(
                    inspection_id=inspection.inspection_id,
                    onion=onion,
                    calibrated=calibrated,
                )
                story.append(onion_block)
                story.append(Spacer(1, 8))

        # =========================================================================
        # FINAL SECTION: SYSTEM LIMITATIONS & TRACEABILITY
        # =========================================================================
        story.append(Spacer(1, 10))
        limitations_block = self._build_limitations_block()
        story.append(KeepTogether(limitations_block))

        # Build document with NumberedCanvas
        def _canvas_factory(*args: Any, **kwargs: Any) -> NumberedCanvas:
            canv = NumberedCanvas(*args, **kwargs)
            canv.doc_inspection_id = inspection.inspection_id
            return canv

        doc.build(story, canvasmaker=_canvas_factory)
        return output_path

    def _build_onion_result_block(
        self,
        inspection_id: str,
        onion: OnionResult,
        calibrated: bool,
    ) -> KeepTogether:
        """Constructs a clean, tabular evaluation block for a single detected onion."""
        # Thumbnail crop flowable
        crop_file = settings.upload_path / f"{inspection_id}_onion_{onion.onion_number}_crop.jpg"
        crop_img = self._safe_image_flowable(str(crop_file), max_w=75, max_h=75)
        if not crop_img:
            # Placeholder cell
            crop_cell = Paragraph(
                f"<font color='#94a3b8'>No Crop<br/>#{onion.onion_number}</font>",
                self.styles["StatLabel"],
            )
        else:
            crop_cell = crop_img

        # Parse JSON fields
        morph = {}
        if getattr(onion, "morphometry_json", None):
            try:
                morph = json.loads(onion.morphometry_json)
            except Exception:
                pass

        reasons = []
        if getattr(onion, "reasons_json", None):
            try:
                reasons = json.loads(onion.reasons_json)
            except Exception:
                pass
        if not reasons:
            reasons = [
                "Healthy classification"
                if onion.quality_class == "Healthy"
                else "Quality evaluation completed"
            ]

        # Metric vs Pixel dimensions
        pixel_diam = getattr(onion, "size_pixels", None) or morph.get("equivalent_diameter_pixels")
        pixel_area = morph.get("area_pixels")
        pixel_perim = morph.get("perimeter_pixels")
        circ = morph.get("circularity")
        aspect = morph.get("aspect_ratio")

        parts = []
        if pixel_diam is not None:
            parts.append(f"<b>Eq. Diameter:</b> {float(pixel_diam):.1f} px")
        if pixel_area is not None:
            parts.append(f"<b>Area:</b> {float(pixel_area):.0f} px²")
        if pixel_perim is not None:
            parts.append(f"<b>Perimeter:</b> {float(pixel_perim):.1f} px")
        if circ is not None:
            parts.append(f"<b>Circularity:</b> {float(circ):.2f}")
        if aspect is not None:
            parts.append(f"<b>Aspect Ratio:</b> {float(aspect):.2f}")

        pixel_dim_text = " | ".join(parts) if parts else "Morphometry pending or unavailable"

        if calibrated and onion.size_mm is not None:
            phys_dim_text = f"<font color='#065f46'><b>Calibrated Diameter: {float(onion.size_mm):.1f} mm</b></font>"
        else:
            phys_dim_text = "<font color='#b45309'><b>Physical measurements unavailable — reference-object calibration required.</b></font>"

        # Confidences
        health_conf = (
            f"{(onion.confidence * 100):.1f}%"
            if onion.confidence is not None
            else "N/A"
        )
        seg_conf = (
            f"{(onion.segmentation_confidence * 100):.1f}%"
            if getattr(onion, "segmentation_confidence", None) is not None
            else health_conf
        )
        # Combined confidence: average of segmentation and health if both present
        if onion.confidence is not None and getattr(onion, "segmentation_confidence", None) is not None:
            comb_conf_val = (onion.confidence + onion.segmentation_confidence) / 2.0
            comb_conf = f"{(comb_conf_val * 100):.1f}%"
        else:
            comb_conf = health_conf

        # Grade color styling
        grade_str = onion.grade or "Grade C"
        if grade_str == "Grade A":
            grade_badge = "<font color='#065f46'><b>GRADE A</b></font>"
        elif grade_str == "Grade B":
            grade_badge = "<font color='#1d4ed8'><b>GRADE B</b></font>"
        elif grade_str == "Reject":
            grade_badge = "<font color='#b91c1c'><b>REJECT</b></font>"
        else:
            grade_badge = "<font color='#b45309'><b>GRADE C</b></font>"

        health_badge = (
            "<font color='#065f46'><b>Healthy</b></font>"
            if onion.quality_class == "Healthy"
            else "<font color='#b91c1c'><b>Unhealthy</b></font>"
        )

        reasons_bulleted = "<br/>".join([f"• {r}" for r in reasons[:3]])

        # Details table
        details_data = [
            [
                Paragraph(
                    f"<b>Bulb #{onion.onion_number}</b> — <i>{onion.variety or 'Onion'}</i>",
                    self.styles["TableCellBold"],
                ),
                Paragraph(f"<b>Grade:</b> {grade_badge}", self.styles["TableCell"]),
                Paragraph(f"<b>Health:</b> {health_badge}", self.styles["TableCell"]),
                Paragraph(f"<b>Review:</b> {onion.review_status or 'AUTO_ACCEPTABLE'}", self.styles["TableCell"]),
            ],
            [
                Paragraph(f"<b>Seg Conf:</b> {seg_conf}", self.styles["TableCell"]),
                Paragraph(f"<b>Health Conf:</b> {health_conf}", self.styles["TableCell"]),
                Paragraph(f"<b>Combined Conf:</b> {comb_conf}", self.styles["TableCell"]),
                Paragraph(f"<b>Defect Area:</b> {onion.defect_area or 0.0:.1f}%", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>PIXEL MEASUREMENT:</b>", self.styles["DocMetaLabel"]),
                Paragraph(pixel_dim_text, self.styles["TableCell"]),
                Paragraph("", self.styles["TableCell"]),
                Paragraph("", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>CALIBRATED MEASUREMENT:</b>", self.styles["DocMetaLabel"]),
                Paragraph(phys_dim_text, self.styles["TableCell"]),
                Paragraph("", self.styles["TableCell"]),
                Paragraph("", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Grading Rationale:</b>", self.styles["DocMetaLabel"]),
                Paragraph(reasons_bulleted, self.styles["ReasonBullet"]),
                Paragraph("", self.styles["TableCell"]),
                Paragraph("", self.styles["TableCell"]),
            ],
        ]

        details_table = Table(
            details_data,
            colWidths=[110, 115, 115, 110],
        )
        details_table.setStyle(
            TableStyle(
                [
                    ("SPAN", (1, 2), (3, 2)),
                    ("SPAN", (1, 3), (3, 3)),
                    ("SPAN", (1, 4), (3, 4)),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )

        card_data = [[crop_cell, details_table]]
        card_table = Table(card_data, colWidths=[80, 460])
        card_table.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ffffff")),
                    ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f8fafc")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ALIGN", (0, 0), (0, 0), "CENTER"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        return KeepTogether([card_table])

    def _build_limitations_block(self) -> List[Any]:
        """Constructs the mandatory technical limitations and legal disclaimer section."""
        items: List[Any] = []
        items.append(Paragraph("6. Technical Limitations & Engineering Disclaimers", self.styles["SectionHeading"]))
        items.append(Spacer(1, 4))

        limitations_text = (
            "<b>1. Visible Surface Inspection:</b> RGB optical inspection captures only visible external outer tunic "
            "and epidermal features. Subsurface physiological decay, internal core rot, black mold beneath dry tunics, "
            "and bacterial soft rot cannot be evaluated without destructive cutting or non-visible spectral scanning.<br/>"
            "<b>2. Internal Rot Limitation:</b> A 'Healthy' external surface classification does not guarantee the absence "
            "of interior fungal or bacterial degradation.<br/>"
            "<b>3. Scale Calibration Requirement:</b> Absolute millimeter measurements require an explicit planar reference "
            "standard. When uncalibrated, only raw pixel morphometry is recorded; metric physical dimensions are never fabricated.<br/>"
            "<b>4. Prototype Grading Notice:</b> Automated grading tiers (Grade A/B/C/Reject) are derived from an engineering "
            "prototype rule engine for Smart India Hackathon technical evaluation and decision support. They do not constitute "
            "statutory agricultural certification (such as AGMARK, NAFED, or export grade certificates).<br/>"
            "<b>5. Confidence Metric:</b> Model confidence denotes neural network softmax certainty on visible visual patterns, "
            "not verified laboratory accuracy or shelf-life durability.<br/>"
            "<b>6. Decision Support:</b> Results are intended for assisted inspection and preliminary screening. Critical commercial "
            "batches require certified laboratory metrology and expert human inspection."
        )

        lim_box = Table(
            [[Paragraph(limitations_text, self.styles["CalloutText"])]],
            colWidths=[540],
        )
        lim_box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        items.append(lim_box)
        return items


pdf_generator = PDFReportGenerator()

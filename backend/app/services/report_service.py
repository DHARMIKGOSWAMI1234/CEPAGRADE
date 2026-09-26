import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Inspection, Report
from app.schemas.inspection import ReportResponse
from app.services.pdf_generator import pdf_generator


class ReportService:
    """
    Report generation and management service.
    Phase 07: Generates, retrieves, and validates deterministic ReportLab PDF inspection reports.
    """

    def validate_inspection_id(self, inspection_id: str) -> None:
        """Validates inspection identifier format to prevent path traversal or injection."""
        if not inspection_id or not re.match(r"^INS-[A-Za-z0-9_-]+$", inspection_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid inspection ID format: '{inspection_id}'.",
            )

    def generate_inspection_report(
        self,
        db: Session,
        inspection_id: str,
        force_regenerate: bool = False,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
    ) -> ReportResponse:
        """
        Generates or retrieves a formatted inspection report.
        For completed inspections, builds a real ReportLab PDF report and records it.
        For pending inspections, preserves non-ready status until CV pipeline completes.
        """
        self.validate_inspection_id(inspection_id)

        record = (
            db.query(Inspection)
            .filter(Inspection.inspection_id == inspection_id)
            .first()
        )
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inspection with ID '{inspection_id}' not found.",
            )

        # Enforce inspection report ownership
        if user_id is not None and role not in ["admin", "supervisor"]:
            if record.owner_id is not None and str(record.owner_id) != str(user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not own this inspection report.",
                )
            if record.user_id is not None and str(record.user_id) != str(user_id) and record.owner_id is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not own this inspection report.",
                )

        # Check if inspection is pending execution
        if record.status == "pending":
            return ReportResponse(
                inspection_id=inspection_id,
                status="not_implemented",
                file_path=None,
                created_at=None,
                message="Inspection is pending completion. PDF report generation engine is scheduled for implementation in Phase 07.",
                pdf_url=None,
                file_size_bytes=None,
            )

        # Check if a report was already recorded and valid on disk
        existing_report = (
            db.query(Report)
            .filter(Report.inspection_id == inspection_id)
            .first()
        )
        if existing_report and not force_regenerate:
            report_path = Path(existing_report.file_path).resolve()
            if report_path.exists():
                return ReportResponse(
                    inspection_id=inspection_id,
                    status="available",
                    file_path=str(report_path),
                    created_at=existing_report.created_at,
                    message="Report retrieved successfully.",
                    pdf_url=f"/api/inspections/{inspection_id}/report/pdf",
                    file_size_bytes=report_path.stat().st_size,
                )

        # Generate real ReportLab PDF report
        safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", inspection_id)
        pdf_filename = f"ONIONVISION_Report_{safe_id}.pdf"
        target_path = (settings.reports_path / pdf_filename).resolve()

        # Path traversal guard
        if not str(target_path).startswith(str(settings.reports_path.resolve())):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security violation: Invalid report destination path.",
            )

        pdf_path = pdf_generator.build_report_pdf(record, target_path)
        file_size = pdf_path.stat().st_size

        now = datetime.now(timezone.utc)
        if existing_report:
            existing_report.file_path = str(pdf_path)
            existing_report.created_at = now
        else:
            new_report = Report(
                inspection_id=inspection_id,
                file_path=str(pdf_path),
                created_at=now,
            )
            db.add(new_report)
        db.commit()

        return ReportResponse(
            inspection_id=inspection_id,
            status="available",
            file_path=str(pdf_path),
            created_at=now,
            message="Report generated successfully.",
            pdf_url=f"/api/inspections/{inspection_id}/report/pdf",
            file_size_bytes=file_size,
        )

    def get_report_pdf_file(
        self,
        db: Session,
        inspection_id: str,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
    ) -> Tuple[Path, str]:
        """
        Retrieves the generated PDF file path and download filename.
        Generates the PDF if not already present.
        """
        self.validate_inspection_id(inspection_id)

        record = (
            db.query(Inspection)
            .filter(Inspection.inspection_id == inspection_id)
            .first()
        )
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inspection with ID '{inspection_id}' not found.",
            )

        # Enforce inspection report ownership
        if user_id is not None and role not in ["admin", "supervisor"]:
            if record.owner_id is not None and str(record.owner_id) != str(user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not own this inspection report.",
                )
            if record.user_id is not None and str(record.user_id) != str(user_id) and record.owner_id is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not own this inspection report.",
                )

        if record.status == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inspection '{inspection_id}' is pending completion before PDF report can be generated.",
            )

        safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", inspection_id)
        pdf_filename = f"ONIONVISION_Report_{safe_id}.pdf"
        target_path = (settings.reports_path / pdf_filename).resolve()

        # Path traversal guard
        if not str(target_path).startswith(str(settings.reports_path.resolve())):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security violation: Invalid report destination path.",
            )

        if not target_path.exists():
            self.generate_inspection_report(db=db, inspection_id=inspection_id)

        if not target_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report file could not be located or generated for inspection '{inspection_id}'.",
            )

        return target_path, pdf_filename


report_service = ReportService()

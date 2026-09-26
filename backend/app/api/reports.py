from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.inspection import ReportResponse
from app.services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get(
    "/{inspection_id}",
    response_model=ReportResponse,
    summary="Retrieve report metadata by inspection ID",
)
def get_report_by_inspection_id(
    inspection_id: str,
    db: Session = Depends(get_db),
) -> ReportResponse:
    """Convenience endpoint returning inspection report status."""
    return report_service.generate_inspection_report(db=db, inspection_id=inspection_id)


@router.get(
    "/{inspection_id}/pdf",
    summary="Download inspection report PDF by inspection ID",
)
def download_report_by_inspection_id(
    inspection_id: str,
    db: Session = Depends(get_db),
):
    """Convenience endpoint downloading inspection report PDF."""
    from fastapi.responses import FileResponse

    pdf_path, filename = report_service.get_report_pdf_file(db=db, inspection_id=inspection_id)
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=filename,
    )

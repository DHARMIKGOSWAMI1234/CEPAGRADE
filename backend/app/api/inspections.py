from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.deps import get_current_user, get_current_user_optional
from app.core.firebase_auth import AuthenticatedUser
from app.db.database import get_db
from app.db.models import Inspection, OnionResult
from app.schemas.inspection import (
    InspectionDetailResponse,
    InspectionSummary,
    InspectionUploadResponse,
    ReportResponse,
)
from app.schemas.result import OnionResultResponse
from app.services.inspection_service import inspection_service
from app.services.report_service import report_service

router = APIRouter(prefix="/inspections", tags=["Inspections"])


@router.post(
    "",
    response_model=InspectionUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload image and initiate new inspection",
)
def create_inspection(
    file: UploadFile = File(..., description="Onion batch image (JPEG, PNG, WEBP)"),
    process: bool = Query(False, description="Whether to execute end-to-end CV pipeline immediately"),
    reference_diameter_mm: Optional[float] = Query(None, description="Known physical reference dimension in mm"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InspectionUploadResponse:
    """
    Uploads an image, validates format and size, assigns ownership from verified JWT,
    and initializes an inspection record. If process=True, executes the CV pipeline.
    """
    return inspection_service.create_inspection(
        db=db,
        file=file,
        auto_process=process,
        known_reference_diameter_mm=reference_diameter_mm,
        owner_id=current_user.id,
        user_id=current_user.int_id,
    )


@router.post(
    "/{inspection_id}/process",
    response_model=InspectionDetailResponse,
    summary="Execute end-to-end CV pipeline on an uploaded inspection",
)
def process_inspection(
    inspection_id: str,
    reference_diameter_mm: Optional[float] = Query(None, description="Known physical reference dimension in mm"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InspectionDetailResponse:
    """
    Executes the full Phase 04 computer vision inspection pipeline on the saved inspection image.
    Enforces that caller has ownership permissions.
    """
    record = db.query(Inspection).filter(Inspection.inspection_id == inspection_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection with ID '{inspection_id}' not found.",
        )
    inspection_service.verify_inspection_ownership(record, user_id=current_user.id, role=current_user.role)

    return inspection_service.execute_inspection(
        db=db,
        inspection_id=inspection_id,
        known_reference_diameter_mm=reference_diameter_mm,
    )


@router.get(
    "",
    response_model=List[InspectionSummary],
    summary="List recent inspections",
)
def list_inspections(
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of inspections to return"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[InspectionSummary]:
    """Retrieves a paginated list of recent inspections scoped to authenticated user ownership."""
    return inspection_service.list_inspections(
        db=db,
        skip=skip,
        limit=limit,
        owner_id=current_user.id,
        user_id=current_user.int_id,
        role=current_user.role,
    )


@router.get(
    "/{inspection_id}",
    response_model=InspectionDetailResponse,
    summary="Retrieve complete inspection details",
)
def get_inspection(
    inspection_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InspectionDetailResponse:
    """Retrieves full inspection record by ID, verifying owner identity."""
    return inspection_service.get_inspection(
        db=db,
        inspection_id=inspection_id,
        user_id=current_user.id,
        role=current_user.role,
    )


@router.get(
    "/{inspection_id}/results",
    response_model=List[OnionResultResponse],
    summary="Retrieve individual onion results",
)
def get_inspection_results(
    inspection_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[OnionResultResponse]:
    """Retrieves list of detected onions and individual grading results for an inspection."""
    return inspection_service.get_inspection_results(
        db=db,
        inspection_id=inspection_id,
        user_id=current_user.id,
        role=current_user.role,
    )


@router.get(
    "/{inspection_id}/report",
    response_model=ReportResponse,
    summary="Retrieve or generate inspection report reference",
)
def get_inspection_report(
    inspection_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportResponse:
    """Retrieves inspection report status or reference, enforcing caller ownership."""
    return report_service.generate_inspection_report(
        db=db,
        inspection_id=inspection_id,
        user_id=current_user.id,
        role=current_user.role,
    )


@router.get(
    "/{inspection_id}/report/pdf",
    summary="Download official inspection report PDF",
)
def download_inspection_report_pdf(
    inspection_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serves the generated PDF inspection report binary with application/pdf content type."""
    from fastapi.responses import FileResponse

    pdf_path, filename = report_service.get_report_pdf_file(
        db=db,
        inspection_id=inspection_id,
        user_id=current_user.id,
        role=current_user.role,
    )
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=filename,
    )


@router.get(
    "/{inspection_id}/image",
    summary="Retrieve uploaded inspection source image",
)
def get_inspection_image(
    inspection_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Safely serves the uploaded image for this inspection."""
    from fastapi.responses import FileResponse

    record = db.query(Inspection).filter(Inspection.inspection_id == inspection_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection '{inspection_id}' not found.")
    
    inspection_service.verify_inspection_ownership(record, user_id=current_user.id, role=current_user.role)

    img_path = Path(record.image_path).resolve()
    if not str(img_path).startswith(str(settings.upload_path.resolve())):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    if not img_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image asset not found.")

    media_type = "image/png" if img_path.suffix.lower() == ".png" else "image/jpeg"
    return FileResponse(img_path, media_type=media_type)


@router.get(
    "/{inspection_id}/overlay",
    summary="Retrieve rendered AI segmentation overlay image",
)
def get_inspection_overlay(
    inspection_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serves the rendered AI segmentation overlay image with polygons and labels."""
    from fastapi.responses import FileResponse

    record = db.query(Inspection).filter(Inspection.inspection_id == inspection_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection '{inspection_id}' not found.")

    inspection_service.verify_inspection_ownership(record, user_id=current_user.id, role=current_user.role)

    overlay_file = (settings.upload_path / f"{inspection_id}_overlay.jpg").resolve()
    if not str(overlay_file).startswith(str(settings.upload_path.resolve())):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    if not overlay_file.exists():
        img_path = Path(record.image_path).resolve()
        if img_path.exists():
            return FileResponse(img_path, media_type="image/jpeg")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Overlay not yet generated.")

    return FileResponse(overlay_file, media_type="image/jpeg")


@router.get(
    "/{inspection_id}/onions/{onion_number}",
    response_model=OnionResultResponse,
    summary="Retrieve details for a single detected onion",
)
def get_single_onion(
    inspection_id: str,
    onion_number: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OnionResultResponse:
    """Retrieves full evaluation and morphometry data for an individual onion."""
    record = db.query(Inspection).filter(Inspection.inspection_id == inspection_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection '{inspection_id}' not found.")
    inspection_service.verify_inspection_ownership(record, user_id=current_user.id, role=current_user.role)

    return inspection_service.get_single_onion_result(db=db, inspection_id=inspection_id, onion_number=onion_number)


@router.get(
    "/{inspection_id}/onions/{onion_number}/crop",
    summary="Retrieve rectangular crop of single detected onion",
)
def get_onion_crop(
    inspection_id: str,
    onion_number: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serves the extracted bounding-box crop for a specific onion."""
    from fastapi.responses import FileResponse

    record = db.query(Inspection).filter(Inspection.inspection_id == inspection_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection '{inspection_id}' not found.")
    inspection_service.verify_inspection_ownership(record, user_id=current_user.id, role=current_user.role)

    crop_path = (settings.upload_path / f"{inspection_id}_onion_{onion_number}_crop.jpg").resolve()
    if not str(crop_path).startswith(str(settings.upload_path.resolve())):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    if not crop_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Onion crop asset not found.")

    return FileResponse(crop_path, media_type="image/jpeg")


@router.get(
    "/{inspection_id}/onions/{onion_number}/mask",
    summary="Retrieve isolated masked crop of single detected onion",
)
def get_onion_mask(
    inspection_id: str,
    onion_number: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serves the isolated masked crop (background zeroed) for a specific onion."""
    from fastapi.responses import FileResponse

    record = db.query(Inspection).filter(Inspection.inspection_id == inspection_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection '{inspection_id}' not found.")
    inspection_service.verify_inspection_ownership(record, user_id=current_user.id, role=current_user.role)

    mask_path = (settings.upload_path / f"{inspection_id}_onion_{onion_number}_mask.png").resolve()
    if not str(mask_path).startswith(str(settings.upload_path.resolve())):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    if not mask_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Onion masked crop asset not found.")

    return FileResponse(mask_path, media_type="image/png")

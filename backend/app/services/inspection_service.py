import io
import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Tuple
from PIL import Image, UnidentifiedImageError
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.models import Inspection, OnionResult
from app.schemas.inspection import (
    InspectionDetailResponse,
    InspectionSummary,
    InspectionUploadResponse,
)
from app.schemas.result import OnionResultResponse


class InspectionService:
    """Service handling image upload validation, storage, and inspection querying."""

    def generate_inspection_id(self) -> str:
        """Generates a traceable, unique inspection identifier: INS-YYYYMMDD-<uuid8>."""
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        short_id = uuid.uuid4().hex[:8].upper()
        return f"INS-{date_str}-{short_id}"

    def validate_and_read_image(self, file: UploadFile, contents: bytes) -> str:
        """
        Validates the uploaded file:
        1. File size checks (empty or oversized).
        2. Content-type and extension matching.
        3. Real image validation via Pillow (corrupted/fake file rejection).
        Returns the confirmed image format extension (e.g. '.jpg', '.png').
        """
        if not contents or len(contents) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        if len(contents) > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
            raise HTTPException(
                status_code=getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413),
                detail=f"File size exceeds maximum permitted limit of {max_mb:.1f} MB.",
            )

        # Extension check
        filename = file.filename or ""
        ext = Path(filename).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
            )

        # MIME type check
        if file.content_type not in settings.ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported Content-Type '{file.content_type}'. Allowed: {', '.join(settings.ALLOWED_CONTENT_TYPES)}",
            )

        # Pillow binary integrity check
        try:
            with Image.open(io.BytesIO(contents)) as img:
                img.verify()
                fmt = img.format.upper() if img.format else ""
                if fmt not in ["JPEG", "PNG", "WEBP"]:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Image binary format '{fmt}' is not supported.",
                    )
        except (UnidentifiedImageError, OSError, SyntaxError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or corrupted image file: {str(e)}",
            )

        return ext

    def save_image_securely(self, inspection_id: str, original_filename: str, contents: bytes, ext: str) -> Path:
        """
        Sanitizes filename and writes image bytes to configured upload directory.
        Guarantees path traversal immunity.
        """
        # Sanitize original basename
        safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", Path(original_filename).stem)
        saved_filename = f"{inspection_id}_{safe_name}{ext}"
        destination = (settings.upload_path / saved_filename).resolve()

        # Path traversal guard
        if not str(destination).startswith(str(settings.upload_path)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security violation: Invalid filename path.",
            )

        destination.write_bytes(contents)
        return destination

    def create_inspection(
        self,
        db: Session,
        file: UploadFile,
        auto_process: bool = False,
        known_reference_diameter_mm: Optional[float] = None,
        owner_id: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> InspectionUploadResponse:
        """
        Coordinates upload validation, secure persistence, and DB record initialization.
        Status is set to 'pending' by default. If auto_process is True, executes
        the complete CV pipeline immediately.
        """
        contents = file.file.read()
        ext = self.validate_and_read_image(file, contents)
        inspection_id = self.generate_inspection_id()
        saved_path = self.save_image_securely(
            inspection_id=inspection_id,
            original_filename=file.filename or "image",
            contents=contents,
            ext=ext,
        )

        resolved_owner = str(owner_id) if owner_id is not None else None
        resolved_user = user_id if user_id is not None else (int(owner_id) if owner_id and str(owner_id).isdigit() else None)

        # Insert DB record
        record = Inspection(
            inspection_id=inspection_id,
            image_path=str(saved_path),
            status="pending",
            owner_id=resolved_owner,
            user_id=resolved_user,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        if auto_process:
            self.execute_inspection(
                db=db,
                inspection_id=inspection_id,
                known_reference_diameter_mm=known_reference_diameter_mm,
            )
            db.refresh(record)

        return InspectionUploadResponse(
            inspection_id=record.inspection_id,
            status=record.status,
            message="Image uploaded successfully" if not auto_process else "Inspection processed successfully",
            created_at=record.created_at,
        )

    def execute_inspection(
        self,
        db: Session,
        inspection_id: str,
        known_reference_diameter_mm: Optional[float] = None,
    ) -> InspectionDetailResponse:
        """
        Executes the complete Phase 04 computer vision inspection pipeline on the saved image,
        calculates morphometry, runs real YOLOv8n-seg and MobileNetV3-Small models, applies
        deterministic grading, and persists all results to the database.
        """
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

        image_path = Path(record.image_path)
        if not image_path.exists():
            record.status = "failed"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inspection image file missing from storage: {record.image_path}",
            )

        # Run Real CV Pipeline with artifact generation
        from app.cv.pipeline import cv_pipeline
        pipeline_result = cv_pipeline.process(
            image_input=image_path,
            known_reference_diameter_mm=known_reference_diameter_mm,
            output_dir=settings.upload_path,
            inspection_id=inspection_id,
        )

        # Update Inspection DB Record
        record.status = pipeline_result.status
        record.total_onions = pipeline_result.total_onions
        record.average_size_mm = pipeline_result.average_size_mm
        record.quality_score = pipeline_result.quality_score
        record.defect_rate = pipeline_result.defect_rate
        record.calibration_json = json.dumps(pipeline_result.calibration) if pipeline_result.calibration else None
        record.overlay_path = str(settings.upload_path / f"{inspection_id}_overlay.jpg")
        record.completed_at = datetime.now(timezone.utc)

        # Clear previous onion records if any
        db.query(OnionResult).filter(OnionResult.inspection_id == inspection_id).delete()

        # Persist per-onion results
        for onion in pipeline_result.onions:
            onion_record = OnionResult(
                inspection_id=inspection_id,
                onion_number=onion.onion_number,
                size_mm=onion.size_mm,
                quality_class=onion.quality_class,
                grade=onion.grade,
                confidence=onion.quality_confidence,
                defect_area=15.0 if onion.quality_class == "Unhealthy" else 0.0,
                variety=onion.variety,
                review_status=onion.review_status,
                needs_review=1 if onion.needs_review else 0,
                reasons_json=json.dumps(onion.reasons) if onion.reasons else None,
                morphometry_json=json.dumps(onion.morphometry) if onion.morphometry else None,
                bbox_json=json.dumps(onion.bbox) if onion.bbox else None,
                polygon_json=json.dumps(onion.polygon) if onion.polygon else None,
                segmentation_confidence=onion.segmentation_confidence,
                size_pixels=onion.size_pixels,
            )
            db.add(onion_record)

        db.commit()
        db.refresh(record)

        return self.get_inspection(db=db, inspection_id=inspection_id)

    def _format_onion(self, o: OnionResult) -> OnionResultResponse:
        """Converts OnionResult DB model to OnionResultResponse with parsed JSON fields."""
        reasons = json.loads(o.reasons_json) if getattr(o, "reasons_json", None) else None
        morphometry = json.loads(o.morphometry_json) if getattr(o, "morphometry_json", None) else None
        bbox = json.loads(o.bbox_json) if getattr(o, "bbox_json", None) else None
        polygon = json.loads(o.polygon_json) if getattr(o, "polygon_json", None) else None

        crop_file = settings.upload_path / f"{o.inspection_id}_onion_{o.onion_number}_crop.jpg"
        mask_file = settings.upload_path / f"{o.inspection_id}_onion_{o.onion_number}_mask.png"

        crop_url = f"/api/inspections/{o.inspection_id}/onions/{o.onion_number}/crop" if crop_file.exists() else None
        mask_url = f"/api/inspections/{o.inspection_id}/onions/{o.onion_number}/mask" if mask_file.exists() else None

        return OnionResultResponse(
            id=o.id,
            onion_number=o.onion_number,
            size_mm=o.size_mm,
            quality_class=o.quality_class,
            grade=o.grade,
            confidence=o.confidence,
            defect_area=o.defect_area,
            variety=getattr(o, "variety", None) or "Onion",
            review_status=getattr(o, "review_status", None) or "AUTO_ACCEPTABLE",
            needs_review=bool(getattr(o, "needs_review", 0)),
            reasons=reasons or (["Healthy classification"] if o.quality_class == "Healthy" else ["Review recommended"]),
            morphometry=morphometry,
            bbox=bbox,
            polygon=polygon,
            segmentation_confidence=getattr(o, "segmentation_confidence", None) or o.confidence,
            quality_confidence=o.confidence,
            size_pixels=getattr(o, "size_pixels", None),
            crop_url=crop_url,
            mask_url=mask_url,
            created_at=o.created_at,
        )

    def verify_inspection_ownership(
        self,
        inspection: Inspection,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
    ) -> None:
        """Enforces that an inspection can only be accessed by its owner or by admin/supervisor."""
        if not user_id:
            return
        if role in ["admin", "supervisor"]:
            return
        # Legacy unassigned inspections (owner_id is None and user_id is None) are safely accessible
        if inspection.owner_id is None and inspection.user_id is None:
            return
        # Check owner_id match
        if inspection.owner_id and str(inspection.owner_id) == str(user_id):
            return
        # Check user_id match
        if inspection.user_id is not None and str(inspection.user_id) == str(user_id):
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own this inspection.",
        )

    def list_inspections(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 50,
        owner_id: Optional[str] = None,
        user_id: Optional[int] = None,
        role: Optional[str] = None,
    ) -> List[InspectionSummary]:
        """Lists recent inspections ordered chronologically descending, respecting role-aware user scoping."""
        query = db.query(Inspection)
        current_owner = owner_id or (str(user_id) if user_id is not None else None)
        if current_owner is not None and role not in ["admin", "supervisor"]:
            from sqlalchemy import or_, and_
            query = query.filter(
                or_(
                    Inspection.owner_id == current_owner,
                    Inspection.user_id == user_id if user_id is not None else False,
                    and_(Inspection.owner_id.is_(None), Inspection.user_id.is_(None)),
                )
            )
        records = (
            query.order_by(Inspection.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        summaries = []
        for r in records:
            summary = InspectionSummary.model_validate(r)
            summary.image_url = f"/api/inspections/{r.inspection_id}/image"
            summaries.append(summary)
        return summaries

    def get_inspection(
        self,
        db: Session,
        inspection_id: str,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
    ) -> InspectionDetailResponse:
        """Retrieves a single complete inspection record."""
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
        self.verify_inspection_ownership(record, user_id=user_id, role=role)

        # Aggregate grade distribution dynamically from onion results if any exist
        distribution = {"A": 0, "B": 0, "C": 0, "Reject": 0}
        for onion in record.onions:
            if onion.grade == "Grade A":
                distribution["A"] += 1
            elif onion.grade == "Grade B":
                distribution["B"] += 1
            elif onion.grade == "Grade C":
                distribution["C"] += 1
            elif onion.grade == "Reject":
                distribution["Reject"] += 1

        calib_data = json.loads(record.calibration_json) if getattr(record, "calibration_json", None) else None
        overlay_exists = (settings.upload_path / f"{inspection_id}_overlay.jpg").exists()

        return InspectionDetailResponse(
            inspection_id=record.inspection_id,
            status=record.status,
            created_at=record.created_at,
            completed_at=record.completed_at,
            total_onions=record.total_onions,
            average_size_mm=record.average_size_mm,
            quality_score=record.quality_score,
            defect_rate=record.defect_rate,
            grade_distribution=distribution if record.onions else None,
            calibration=calib_data,
            image_url=f"/api/inspections/{inspection_id}/image",
            overlay_url=f"/api/inspections/{inspection_id}/overlay" if overlay_exists else None,
            onions=[self._format_onion(o) for o in record.onions],
        )

    def get_inspection_results(
        self,
        db: Session,
        inspection_id: str,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
    ) -> List[OnionResultResponse]:
        """Retrieves onion-level results for an inspection, raising 404 if inspection doesn't exist."""
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
        self.verify_inspection_ownership(record, user_id=user_id, role=role)
        return [self._format_onion(o) for o in record.onions]

    def get_single_onion_result(self, db: Session, inspection_id: str, onion_number: int) -> OnionResultResponse:
        """Retrieves single onion result by inspection_id and onion_number."""
        onion = (
            db.query(OnionResult)
            .filter(OnionResult.inspection_id == inspection_id, OnionResult.onion_number == onion_number)
            .first()
        )
        if not onion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Onion #{onion_number} for inspection '{inspection_id}' not found.",
            )
        return self._format_onion(onion)



inspection_service = InspectionService()

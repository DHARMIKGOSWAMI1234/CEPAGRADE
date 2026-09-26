from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from .result import OnionResultResponse


class GradeDistribution(BaseModel):
    """Distribution counts for prototype grades."""

    A: int = Field(default=0, description="Count of Grade A onions")
    B: int = Field(default=0, description="Count of Grade B onions")
    C: int = Field(default=0, description="Count of Grade C onions")
    Reject: int = Field(default=0, description="Count of Rejected onions")


class InspectionUploadResponse(BaseModel):
    """Response returned upon successful image upload and inspection registration."""

    inspection_id: str = Field(description="Unique inspection tracking identifier")
    status: str = Field(default="pending", description="Current status of the inspection")
    message: str = Field(default="Image uploaded successfully")
    created_at: Optional[datetime] = None


class InspectionSummary(BaseModel):
    """Summary representation of an inspection for list views."""

    inspection_id: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    total_onions: Optional[int] = None
    average_size_mm: Optional[float] = None
    quality_score: Optional[float] = None
    defect_rate: Optional[float] = None
    image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InspectionDetailResponse(BaseModel):
    """Complete inspection representation conforming to Section 18 of Master Plan."""

    inspection_id: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    total_onions: Optional[int] = None
    average_size_mm: Optional[float] = None
    quality_score: Optional[float] = None
    defect_rate: Optional[float] = None
    grade_distribution: Optional[Dict[str, int]] = None
    calibration: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None
    overlay_url: Optional[str] = None
    onions: List[OnionResultResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ReportResponse(BaseModel):
    """Schema for inspection report retrieval or status."""

    inspection_id: str
    status: str
    file_path: Optional[str] = None
    created_at: Optional[datetime] = None
    message: str
    pdf_url: Optional[str] = None
    file_size_bytes: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class OnionResultBase(BaseModel):
    """Base schema for individual onion measurement and quality results."""

    onion_number: int
    size_mm: Optional[float] = Field(default=None, description="Estimated onion diameter in millimetres")
    quality_class: Optional[str] = Field(default=None, description="Supported visible quality category")
    grade: Optional[str] = Field(default=None, description="Prototype grade (e.g., A, B, C, Reject)")
    confidence: Optional[float] = Field(default=None, description="Model prediction confidence score [0.0 - 1.0]")
    defect_area: Optional[float] = Field(default=None, description="Visible defect area in mm² or pixels")
    quality_score: Optional[float] = Field(default=None, description="Calculated instance quality score [0.0 - 100.0]")

    # Rich explainable evaluation metadata
    variety: Optional[str] = Field(default=None, description="Identified onion variety (Red, Yellow, etc.)")
    review_status: Optional[str] = Field(default=None, description="Review flag (AUTO_ACCEPTABLE, REVIEW_RECOMMENDED, etc.)")
    needs_review: Optional[bool] = Field(default=None, description="Boolean flag if review is recommended")
    reasons: Optional[List[str]] = Field(default=None, description="Transparent grading explanation reasons")
    breakdown: Optional[Dict[str, Any]] = Field(default=None, description="Structured explainability breakdown across size, health, defects, and final score")
    morphometry: Optional[Dict[str, Any]] = Field(default=None, description="Geometric measurements (area, perimeter, circularity, etc.)")
    bbox: Optional[List[int]] = Field(default=None, description="Bounding box [xmin, ymin, xmax, ymax]")
    polygon: Optional[List[List[float]]] = Field(default=None, description="Contour polygon coordinates")
    segmentation_confidence: Optional[float] = Field(default=None, description="YOLO instance segmentation confidence")
    quality_confidence: Optional[float] = Field(default=None, description="MobileNetV3 health classification confidence")
    size_pixels: Optional[float] = Field(default=None, description="Measurement in image pixels")
    crop_url: Optional[str] = Field(default=None, description="API URL to individual onion visual crop")
    mask_url: Optional[str] = Field(default=None, description="API URL to individual onion masked crop")


class OnionResultCreate(OnionResultBase):
    """Schema for internal creation of an onion result."""

    inspection_id: str


class OnionResultResponse(OnionResultBase):
    """Schema returned by API for an individual onion result."""

    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

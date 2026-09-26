from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


def utc_now():
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


class User(Base):
    """Database model representing an authenticated user account."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    email = Column(String(256), unique=True, index=True, nullable=False)
    password_hash = Column(String(512), nullable=False)
    role = Column(String(32), nullable=False, default="operator")  # operator, supervisor, inspector, farmer, admin
    is_active = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    inspections = relationship("Inspection", back_populates="user")


class Inspection(Base):
    """Database model representing a single onion batch or image inspection."""

    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(String(64), unique=True, index=True, nullable=False)
    image_path = Column(String(512), nullable=False)
    status = Column(String(32), nullable=False, default="pending", index=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Optional user ownership
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    owner_id = Column(String(128), nullable=True, index=True)

    # Aggregated AI-derived metrics (nullable until ML inference pipeline runs in future phases)
    total_onions = Column(Integer, nullable=True)
    average_size_mm = Column(Float, nullable=True)
    quality_score = Column(Float, nullable=True)
    defect_rate = Column(Float, nullable=True)
    calibration_json = Column(String(2048), nullable=True)
    overlay_path = Column(String(512), nullable=True)

    # Relationships
    user = relationship("User", back_populates="inspections")
    onions = relationship(
        "OnionResult",
        back_populates="inspection",
        cascade="all, delete-orphan",
        order_by="OnionResult.onion_number",
    )
    reports = relationship(
        "Report",
        back_populates="inspection",
        cascade="all, delete-orphan",
    )


class OnionResult(Base):
    """Database model representing an individual onion detected in an inspection."""

    __tablename__ = "onion_results"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(
        String(64),
        ForeignKey("inspections.inspection_id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    onion_number = Column(Integer, nullable=False)

    # Features (nullable until Phase 02/03/04 define labels and models)
    size_mm = Column(Float, nullable=True)
    quality_class = Column(String(64), nullable=True)
    grade = Column(String(16), nullable=True)
    confidence = Column(Float, nullable=True)
    defect_area = Column(Float, nullable=True)

    # Rich evaluation metadata
    variety = Column(String(64), nullable=True)
    review_status = Column(String(64), nullable=True)
    needs_review = Column(Integer, default=0, nullable=True)
    reasons_json = Column(String(2048), nullable=True)
    morphometry_json = Column(String(4096), nullable=True)
    bbox_json = Column(String(256), nullable=True)
    polygon_json = Column(String(8192), nullable=True)
    segmentation_confidence = Column(Float, nullable=True)
    size_pixels = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    inspection = relationship("Inspection", back_populates="onions")


class Report(Base):
    """Database model representing generated inspection reports."""

    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(
        String(64),
        ForeignKey("inspections.inspection_id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    file_path = Column(String(512), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    inspection = relationship("Inspection", back_populates="reports")

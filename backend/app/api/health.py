from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    service: str
    models_ready: Optional[bool] = None


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return service health status and ML model operational readiness."""
    try:
        from app.cv.pipeline import cv_pipeline
        ready = cv_pipeline.is_configured()
    except Exception:
        ready = False

    return HealthResponse(
        status="ok",
        service="onionvision-backend",
        models_ready=ready,
    )

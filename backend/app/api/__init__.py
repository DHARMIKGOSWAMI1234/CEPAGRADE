# backend/app/api/__init__.py
from fastapi import APIRouter
from .health import router as health_router
from .auth import router as auth_router
from .inspections import router as inspections_router
from .results import router as results_router
from .reports import router as reports_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(inspections_router)
api_router.include_router(results_router)
api_router.include_router(reports_router)

__all__ = ["api_router"]

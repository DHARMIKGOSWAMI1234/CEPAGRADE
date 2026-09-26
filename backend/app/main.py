import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import api_router
from app.core.config import settings
from app.db.database import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("onionvision.backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and shutdown routines."""
    logger.info("Initializing ONIONVISION backend foundation...")
    init_db()
    logger.info("SQLite database tables verified/initialized.")
    logger.info(f"Upload storage directory: {settings.upload_path}")
    yield
    logger.info("Shutting down ONIONVISION backend.")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Based Onion Quality Inspection & Automated Grading System — Backend API Foundation",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware (explicitly configured for local Vite frontend development)
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    """Ensure consistent structured error responses without leaking internal internals."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "status_code": exc.status_code,
            "detail": exc.detail,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler to guard against stack trace leakage."""
    logger.exception(f"Unhandled error processing request: {request.url.path}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "detail": "An internal server error occurred. Please consult backend logs.",
        },
    )


# Mount consolidated API routes
app.include_router(api_router)


@app.get("/", tags=["Root"])
def root():
    """Root entry point directing consumers to API documentation."""
    return {
        "service": settings.APP_NAME,
        "status": "online",
        "version": "0.1.0",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }

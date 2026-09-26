import io
import shutil
import tempfile
from pathlib import Path
from typing import Generator
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.db.database import Base, get_db
from app.main import app

from sqlalchemy.pool import StaticPool

# Create in-memory SQLite database engine with StaticPool for test isolation
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Create isolated temporary upload storage for test runs."""
    temp_dir = tempfile.mkdtemp(prefix="onionvision_test_uploads_")
    original_upload_dir = settings.UPLOAD_DIR
    settings.UPLOAD_DIR = temp_dir
    yield
    settings.UPLOAD_DIR = original_upload_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provides a clean database session per test by recreating tables."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Test client with database dependency overridden to test DB session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def valid_jpeg_bytes() -> bytes:
    """Generates valid minimal JPEG image binary bytes for testing."""
    img = Image.new("RGB", (100, 100), color=(180, 50, 50))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    return buffer.getvalue()


@pytest.fixture
def valid_png_bytes() -> bytes:
    """Generates valid minimal PNG image binary bytes for testing."""
    img = Image.new("RGB", (80, 80), color=(200, 200, 100))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def fake_image_bytes() -> bytes:
    """Returns invalid/corrupted bytes pretending to be an image."""
    return b"This is plain text pretending to be an image file."

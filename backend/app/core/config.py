from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings loaded from environment or .env file."""

    APP_NAME: str = "ONIONVISION"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./onionvision.db"

    # Storage paths
    UPLOAD_DIR: str = "./storage/uploads"
    MODEL_DIR: str = "../ml/models"
    REPORTS_DIR: str = "./backend/data/reports"

    # Upload validation constraints
    MAX_UPLOAD_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
    ALLOWED_CONTENT_TYPES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ]
    ALLOWED_EXTENSIONS: List[str] = [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
    ]

    # Authentication & Security
    JWT_SECRET: str = "onionvision_super_secret_jwt_key_dev_safe_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Legacy / Optional External Integration Configuration
    SUPABASE_URL: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Firebase Authentication Configuration
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def upload_path(self) -> Path:
        """Returns the resolved absolute path to upload storage, ensuring directory exists."""
        path = Path(self.UPLOAD_DIR).resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def reports_path(self) -> Path:
        """Returns the resolved absolute path to reports storage, ensuring directory exists."""
        cwd = Path.cwd().resolve()
        path = Path(self.REPORTS_DIR)
        if not path.is_absolute():
            if cwd.name == "backend" and (self.REPORTS_DIR.startswith("./backend/") or self.REPORTS_DIR.startswith("backend/")):
                rel = self.REPORTS_DIR.replace("./backend/", "").replace("backend/", "")
                path = (cwd / rel).resolve()
            else:
                path = (cwd / self.REPORTS_DIR).resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()

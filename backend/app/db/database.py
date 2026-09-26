from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Engine configuration for SQLite
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session and safely closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all database tables and add any newly introduced columns to existing tables."""
    # Import models here to ensure they are registered with Base.metadata
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Lightweight SQLite schema migration helper
    if settings.DATABASE_URL.startswith("sqlite"):
        with engine.connect() as conn:
            from sqlalchemy import text
            # Check inspections table
            result = conn.execute(text("PRAGMA table_info(inspections)"))
            insp_cols = {row[1] for row in result.fetchall()}
            if "calibration_json" not in insp_cols:
                conn.execute(text("ALTER TABLE inspections ADD COLUMN calibration_json TEXT"))
            if "overlay_path" not in insp_cols:
                conn.execute(text("ALTER TABLE inspections ADD COLUMN overlay_path VARCHAR(512)"))
            if "user_id" not in insp_cols:
                conn.execute(text("ALTER TABLE inspections ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            if "owner_id" not in insp_cols:
                conn.execute(text("ALTER TABLE inspections ADD COLUMN owner_id VARCHAR(128)"))

            # Check onion_results table
            result = conn.execute(text("PRAGMA table_info(onion_results)"))
            res_cols = {row[1] for row in result.fetchall()}
            new_onion_cols = {
                "variety": "VARCHAR(64)",
                "review_status": "VARCHAR(64)",
                "needs_review": "INTEGER DEFAULT 0",
                "reasons_json": "TEXT",
                "morphometry_json": "TEXT",
                "bbox_json": "TEXT",
                "polygon_json": "TEXT",
                "segmentation_confidence": "FLOAT",
                "size_pixels": "FLOAT",
            }
            for col_name, col_type in new_onion_cols.items():
                if col_name not in res_cols:
                    conn.execute(text(f"ALTER TABLE onion_results ADD COLUMN {col_name} {col_type}"))
            conn.commit()

    # Seed default demonstration user if none exists
    db = SessionLocal()
    try:
        from .models import User
        from app.core.security import hash_password
        if db.query(User).count() == 0:
            demo_user = User(
                name="Head Operator",
                email="operator@onionvision.ai",
                password_hash=hash_password("Operator123!"),
                role="operator",
                is_active=1,
            )
            db.add(demo_user)
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


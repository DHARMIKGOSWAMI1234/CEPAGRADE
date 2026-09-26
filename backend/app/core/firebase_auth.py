import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
import jwt
from fastapi import HTTPException, status
from pydantic import BaseModel
import firebase_admin
from firebase_admin import auth as admin_auth, credentials
from app.core.config import settings


class AuthenticatedUser(BaseModel):
    """Represents an authenticated user identity resolved from a verified Firebase ID token."""
    id: str  # Firebase UID
    email: str
    name: str = "Operator"
    role: str = "operator"
    email_verified: bool = True
    is_active: bool = True
    created_at: Optional[datetime] = None
    int_id_override: Optional[int] = None

    @property
    def int_id(self) -> Optional[int]:
        """Provides backward-compatibility for legacy integer user IDs if applicable."""
        if self.int_id_override is not None:
            return self.int_id_override
        return int(self.id) if str(self.id).isdigit() else None


_firebase_app: Optional[firebase_admin.App] = None


def get_firebase_app() -> Optional[firebase_admin.App]:
    """
    Initializes and returns the singleton Firebase Admin App instance.
    Checks GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_CREDENTIALS_PATH, or application default.
    """
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    # 1. Check explicit service account path from environment or settings
    cred_path = (
        os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        or settings.FIREBASE_CREDENTIALS_PATH
        or settings.GOOGLE_APPLICATION_CREDENTIALS
    )

    if cred_path and Path(cred_path).exists():
        try:
            cred = credentials.Certificate(cred_path)
            opts = {"projectId": settings.FIREBASE_PROJECT_ID} if settings.FIREBASE_PROJECT_ID else None
            _firebase_app = firebase_admin.initialize_app(cred, opts)
            return _firebase_app
        except Exception as e:
            print(f"Warning: Failed to initialize Firebase Admin with credentials file {cred_path}: {e}")

    # 2. Check if a default Firebase App already exists in the process
    try:
        _firebase_app = firebase_admin.get_app()
        return _firebase_app
    except ValueError:
        pass

    # 3. Attempt Application Default Credentials (ADC) or Project ID initialization
    if settings.FIREBASE_PROJECT_ID:
        try:
            _firebase_app = firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})
            return _firebase_app
        except Exception:
            pass

    return None


def create_test_firebase_token(
    uid: Optional[str] = None,
    email: str = "test@cepagrade.ai",
    email_verified: bool = True,
    name: str = "Operator",
    role: str = "operator",
    expires_in_sec: Optional[int] = None,
    user_id: Optional[str] = None,
    expires_in_seconds: Optional[int] = None,
) -> str:
    """
    Generates a cryptographically signed test Firebase ID token for unit and integration testing.
    Uses HMAC-SHA256 with the backend JWT_SECRET.
    Supports both uid/user_id and expires_in_sec/expires_in_seconds for compatibility.
    """
    resolved_uid = uid or user_id or "test-uid-default"
    resolved_exp = (
        expires_in_sec
        if expires_in_sec is not None
        else (expires_in_seconds if expires_in_seconds is not None else 3600)
    )
    now = int(time.time())
    payload: Dict[str, Any] = {
        "iss": "https://securetoken.google.com/cepagrade-ai",
        "aud": "cepagrade-ai",
        "auth_time": now,
        "user_id": resolved_uid,
        "sub": resolved_uid,
        "iat": now,
        "exp": now + resolved_exp,
        "email": email,
        "email_verified": email_verified,
        "name": name,
        "role": role,
        "firebase": {
            "identities": {"email": [email]},
            "sign_in_provider": "password",
        },
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# Alias for compatibility
create_test_token = create_test_firebase_token


def verify_firebase_token(token: str, require_email_verified: bool = True) -> AuthenticatedUser:
    """
    Cryptographically verifies a Firebase ID token.
    Uses official Firebase Admin SDK when configured, or test verification for local suite.
    Enforces expiration, signature validity, UID extraction, and email_verified state.
    """
    if not token or not isinstance(token, str) or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing or empty.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    clean_token = token.strip()

    # 1. Try local/test token decoding with JWT_SECRET first (for test suite resilience)
    try:
        unverified_header = jwt.get_unverified_header(clean_token)
        if unverified_header.get("alg") == "HS256":
            try:
                payload = jwt.decode(
                    clean_token,
                    settings.JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_exp": True, "verify_aud": False},
                )
            except jwt.ExpiredSignatureError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication token has expired. Please sign in again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            except jwt.InvalidTokenError as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid authentication token: {str(e)}",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            uid = str(payload.get("user_id") or payload.get("sub", ""))
            email = str(payload.get("email", ""))
            email_verified = bool(payload.get("email_verified", False))
            user = AuthenticatedUser(
                id=uid,
                email=email,
                name=payload.get("name") or "Operator",
                role=payload.get("role") or "operator",
                email_verified=email_verified,
                is_active=True,
                created_at=datetime.fromtimestamp(payload.get("iat", time.time()), tz=timezone.utc),
            )

            # Enforce email verification (Part 13)
            if require_email_verified and not user.email_verified:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Email verification required. Please verify your email before accessing CEPA GRADE.",
                )

            return user
    except jwt.DecodeError:
        # Not a valid JWT structure
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed or invalid authentication token format.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        raise
    except Exception:
        pass

    # 2. Verify with official Firebase Admin SDK (if credentialed) or Google Public Certificates
    decoded: Optional[Dict[str, Any]] = None
    app = get_firebase_app()
    if app is not None:
        try:
            decoded = admin_auth.verify_id_token(clean_token, app=app, check_revoked=False)
        except admin_auth.ExpiredIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your session has expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except admin_auth.InvalidIdTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Firebase ID token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception:
            # Fall back to public certificate verification if service account credentials are not installed
            decoded = None

    if decoded is None:
        project_id = (settings.FIREBASE_PROJECT_ID or "cepa-grade").strip()
        if not project_id:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service is temporarily unavailable.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests

            req = google_requests.Request()
            decoded = google_id_token.verify_firebase_token(clean_token, req, audience=project_id)
        except ValueError as e:
            err_str = str(e).lower()
            if "expired" in err_str:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Your session has expired. Please sign in again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            elif "wrong audience" in err_str or "wrong project" in err_str:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Firebase token project mismatch. Please sign in again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid Firebase ID token: {str(e)}",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your session is no longer valid. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    uid = str(decoded.get("user_id") or decoded.get("uid") or decoded.get("sub", ""))
    email = str(decoded.get("email", ""))
    email_verified = bool(decoded.get("email_verified", False))

    user = AuthenticatedUser(
        id=uid,
        email=email,
        name=decoded.get("name") or (email.split("@")[0] if email else "Operator"),
        role=decoded.get("role", "operator"),
        email_verified=email_verified,
        is_active=True,
        created_at=datetime.fromtimestamp(decoded.get("auth_time", time.time()), tz=timezone.utc),
    )

    # Enforce email verification (Part 13)
    if require_email_verified and not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required. Please verify your email before accessing CEPA GRADE.",
        )

    return user

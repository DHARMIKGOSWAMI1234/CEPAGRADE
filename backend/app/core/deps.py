from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.firebase_auth import AuthenticatedUser, verify_firebase_token
from app.db.database import get_db
from app.db.models import User


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    """
    Strict FastAPI dependency enforcing authenticated user presence via Bearer token.
    Extracts and cryptographically validates Firebase ID token.
    Enforces email verification (HTTP 403 if unverified).
    Raises HTTP 401 on missing, malformed, expired, or invalid token.
    """
    auth_header = request.headers.get("Authorization")
    token: Optional[str] = None

    if auth_header:
        parts = auth_header.strip().split()
        if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed Authorization header. Required format: 'Bearer <token>'.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = parts[1].strip()
    else:
        # Check query parameter for browser media downloads (e.g., PDF reports)
        query_token = request.query_params.get("token")
        if query_token and query_token.strip():
            token = query_token.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = verify_firebase_token(token, require_email_verified=True)

    # Optional local user record sync / check if exists
    db_user = None
    if user.int_id is not None:
        db_user = db.query(User).filter(User.id == user.int_id).first()
    elif user.email:
        db_user = db.query(User).filter(User.email == user.email).first()
        if not db_user:
            from app.core.security import hash_password
            db_user = User(
                name=user.name or user.email.split("@")[0],
                email=user.email,
                password_hash=hash_password("firebase_google_oauth_managed"),
                role=user.role or "operator",
                is_active=1,
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)

    if db_user:
        if not db_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated.",
            )
        user.int_id_override = db_user.id
        if db_user.name and (not user.name or user.name == "Operator" or user.name == user.email.split("@")[0]):
            user.name = db_user.name
        if db_user.created_at:
            user.created_at = db_user.created_at

    return user


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[AuthenticatedUser]:
    """
    Permissive dependency returning AuthenticatedUser if valid token is provided,
    or None if unauthenticated. Never raises 401/403.
    """
    auth_header = request.headers.get("Authorization")
    token: Optional[str] = None

    if auth_header:
        parts = auth_header.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1].strip():
            token = parts[1].strip()
    else:
        query_token = request.query_params.get("token")
        if query_token and query_token.strip():
            token = query_token.strip()

    if not token:
        return None

    try:
        return verify_firebase_token(token, require_email_verified=False)
    except HTTPException:
        return None

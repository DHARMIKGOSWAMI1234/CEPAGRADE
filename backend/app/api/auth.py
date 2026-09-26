from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.database import get_db
from app.db.models import User
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new ONIONVISION account",
)
def signup(
    payload: UserCreate,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Creates a new user account with hashed password and returns an access token."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    hashed_pw = hash_password(payload.password)
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hashed_pw,
        role=payload.role or "operator",
        is_active=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role, "name": user.name})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and obtain JWT access token",
)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Validates user credentials and issues a signed JWT access token."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact your system administrator.",
        )

    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role, "name": user.name})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Returns profile details of the currently authenticated user."""
    return UserResponse.model_validate(current_user)


@router.post(
    "/logout",
    summary="Logout current user session",
)
def logout(
    current_user: User = Depends(get_current_user),
):
    """Logs out user session and confirms token invalidation on client side."""
    return {"status": "ok", "message": "Successfully logged out.", "user_id": current_user.id}

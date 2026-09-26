import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


ALLOWED_ROLES = ["operator", "supervisor", "inspector", "farmer", "admin"]
PUBLIC_SIGNUP_ROLES = ["operator", "supervisor", "inspector", "farmer"]


class UserCreate(BaseModel):
    """Schema for user registration."""

    name: str = Field(..., min_length=2, max_length=128, description="User full name")
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, max_length=128, description="User password (min 6 chars)")
    role: Optional[str] = Field(default="operator", description="Account role (default: operator)")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Name cannot be empty or whitespace.")
        return stripped

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long.")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> str:
        if not v:
            return "operator"
        role_lower = v.strip().lower()
        if role_lower == "admin":
            raise ValueError("Admin role cannot be self-assigned through public signup.")
        if role_lower not in PUBLIC_SIGNUP_ROLES:
            raise ValueError(f"Invalid role '{v}'. Allowed roles: {', '.join(PUBLIC_SIGNUP_ROLES)}")
        return role_lower


class UserLogin(BaseModel):
    """Schema for user authentication."""

    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., min_length=1, description="Account password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    """Safe public user representation (never exposing password hash)."""

    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Authentication response payload containing JWT access token and user profile."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse

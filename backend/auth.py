"""
JWT authentication utilities and FastAPI dependencies.
"""
from __future__ import annotations

import os
import json
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db, User, get_setting

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_token(user_id: str, username: str, is_admin: bool) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

async def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Require a valid JWT. Returns user payload dict with sub, username, is_admin."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Verify user still exists in DB
    user = await db.get(User, payload["sub"])
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")

    return {
        "user_id": payload["sub"],
        "username": payload["username"],
        "is_admin": payload.get("is_admin", False),
    }


async def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict | None:
    """Like require_user but returns None if no/invalid token."""
    if credentials is None:
        return None
    payload = decode_token(credentials.credentials)
    if payload is None:
        return None
    user = await db.get(User, payload["sub"])
    if user is None:
        return None
    return {
        "user_id": payload["sub"],
        "username": payload["username"],
        "is_admin": payload.get("is_admin", False),
    }


def require_admin(current_user: dict = Depends(require_user)) -> dict:
    """Require the current user to be an admin."""
    if not current_user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

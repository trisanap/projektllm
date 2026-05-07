"""
Auth router — login and admin user management.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db, User
from backend.auth import hash_password, verify_password, create_token, require_user, require_admin

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class LoginBody(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    token: str
    user: dict


class CreateUserBody(BaseModel):
    username: str
    password: str
    display_name: str = ""


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    is_admin: bool
    created_at: str


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@router.post("/login")
async def login(body: LoginBody, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")

    token = create_token(user.id, user.username, user.is_admin)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name or user.username,
            "is_admin": user.is_admin,
        },
    }


# ---------------------------------------------------------------------------
# Get current user
# ---------------------------------------------------------------------------

@router.get("/me")
async def get_me(current_user: dict = Depends(require_user), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, current_user["user_id"])
    if not user:
        raise HTTPException(404, "User not found")
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name or user.username,
        "is_admin": user.is_admin,
    }


# ---------------------------------------------------------------------------
# Admin: user management
# ---------------------------------------------------------------------------

@router.get("/users")
async def list_users(
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return [
        UserOut(
            id=u.id,
            username=u.username,
            display_name=u.display_name or u.username,
            is_admin=u.is_admin,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.post("/users")
async def create_user(
    body: CreateUserBody,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Check duplicate username
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Username already exists")

    user = User(
        id=uuid.uuid4().hex[:12],
        username=body.username,
        password_hash=hash_password(body.password),
        display_name=body.display_name or body.username,
        is_admin=False,
    )
    db.add(user)
    await db.commit()

    return UserOut(
        id=user.id,
        username=user.username,
        display_name=user.display_name or user.username,
        is_admin=user.is_admin,
        created_at=user.created_at,
    )


@router.delete("/users/{uid}")
async def delete_user(
    uid: str,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, uid)
    if not user:
        raise HTTPException(404, "User not found")
    if user.is_admin:
        raise HTTPException(400, "Cannot delete admin users")
    if user.id == current_user["user_id"]:
        raise HTTPException(400, "Cannot delete yourself")

    await db.delete(user)
    await db.commit()
    return {"ok": True}

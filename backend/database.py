import os
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, JSON, select, func, UniqueConstraint, text

DB_PATH = os.path.join(os.path.dirname(__file__), "projektllm.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# User model
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    display_name: Mapped[str] = mapped_column(String(200), default="")
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[str] = mapped_column(String(30), default=lambda: datetime.now(timezone.utc).isoformat())


# ---------------------------------------------------------------------------
# ProjectShare model
# ---------------------------------------------------------------------------

class ProjectShare(Base):
    __tablename__ = "project_shares"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_project_user"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    permission: Mapped[str] = mapped_column(String(10), default="view")  # "view" | "edit"
    shared_by: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[str] = mapped_column(String(30), default=lambda: datetime.now(timezone.utc).isoformat())


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), default="Untitled project")
    color: Mapped[str] = mapped_column(String(50), default="oklch(0.62 0.14 290)")
    glyph: Mapped[str] = mapped_column(String(4), default="UP")
    description: Mapped[str] = mapped_column(Text, default="")
    instructions: Mapped[str] = mapped_column(Text, default="")
    owner_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[str] = mapped_column(String(30), default=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Mapped[str] = mapped_column(String(30), default=lambda: datetime.now(timezone.utc).isoformat())

    chats = relationship("Chat", back_populates="project", order_by="Chat.created_at.desc()", cascade="all, delete-orphan")
    files = relationship("File", back_populates="project", order_by="File.added_at.desc()", cascade="all, delete-orphan")


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), default="New chat")
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[str] = mapped_column(String(30), default=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Mapped[str] = mapped_column(String(30), default=lambda: datetime.now(timezone.utc).isoformat())

    project = relationship("Project", back_populates="chats")
    messages = relationship("Message", back_populates="chat", order_by="Message.created_at", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    chat_id: Mapped[str] = mapped_column(String(32), ForeignKey("chats.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20))  # user / assistant
    content: Mapped[str] = mapped_column(Text, default="")
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    citations: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    user_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, default=None, index=True)
    created_at: Mapped[str] = mapped_column(String(30), default=lambda: datetime.now(timezone.utc).isoformat())

    chat = relationship("Chat", back_populates="messages")


class File(Base):
    __tablename__ = "files"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(300))
    kind: Mapped[str] = mapped_column(String(20), default="txt")
    size: Mapped[str] = mapped_column(String(20), default="0 KB")
    tokens: Mapped[int] = mapped_column(Integer, default=0)
    filepath: Mapped[str | None] = mapped_column(String(500), nullable=True)
    added_at: Mapped[str] = mapped_column(String(30), default=lambda: datetime.now(timezone.utc).isoformat())

    project = relationship("Project", back_populates="files")


class AppSetting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Migrate existing tables: add missing columns
    async with engine.begin() as conn:
        from sqlalchemy import inspect
        def _get_cols(sync_conn):
            return [c["name"] for c in inspect(sync_conn).get_columns("messages")]
        cols = await conn.run_sync(_get_cols)
        if "reasoning" not in cols:
            await conn.execute(text("ALTER TABLE messages ADD COLUMN reasoning TEXT"))
        if "user_id" not in cols:
            await conn.execute(text("ALTER TABLE messages ADD COLUMN user_id VARCHAR(32)"))

    # Seed admin user from env vars (only if no admin exists)
    from backend.auth import hash_password
    admin_username = os.environ.get("ADMIN_USERNAME", "admin")
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if not admin_password:
        return
    async with async_session() as session:
        existing = await session.execute(select(User).where(User.is_admin == True).limit(1))
        if existing.scalar_one_or_none() is None:
            import uuid
            session.add(User(
                id=uuid.uuid4().hex[:12],
                username=admin_username,
                password_hash=hash_password(admin_password),
                display_name="Admin",
                is_admin=True,
            ))
            # Set existing projects without owner_id to be owned by admin
            admin_user = await session.execute(select(User).where(User.username == admin_username).limit(1))
            admin = admin_user.scalar_one_or_none()
            if admin:
                from sqlalchemy import update
                await session.execute(
                    update(Project).where(Project.owner_id.is_(None)).values(owner_id=admin.id)
                )
            await session.commit()


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session


async def get_setting(db: AsyncSession, key: str, default: str = "") -> str:
    row = await db.get(AppSetting, key)
    return row.value if row else default


async def set_setting(db: AsyncSession, key: str, value: str):
    row = await db.get(AppSetting, key)
    if row:
        row.value = value
    else:
        db.add(AppSetting(key=key, value=value))
    await db.commit()

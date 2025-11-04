"""
Async DB helpers using SQLAlchemy (async).

Provides:
- init_db(database_url) to create engine and tables and store a sessionmaker
- get_sessionmaker() to retrieve the initialized sessionmaker
- get_session() FastAPI dependency (async generator)
- insert_audit() and fetch_audits() helpers for audit persistence
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional

from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# We'll dynamically import models when creating metadata to ensure single source of truth
_async_sessionmaker: Optional[async_sessionmaker[AsyncSession]] = None


def _normalize_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://") or url.startswith("sqlite+aiosqlite://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("sqlite://") and "aiosqlite" not in url:
        return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    return url


async def init_db(database_url: str) -> async_sessionmaker[AsyncSession]:
    """
    Initialize engine, create tables (imports canonical models), and return a sessionmaker.
    """
    global _async_sessionmaker
    url = _normalize_url(database_url)
    engine = create_async_engine(url, echo=False)
    # import models to get metadata
    try:
        import src.models.audit_log as audit_model  # noqa: F401
        metadata = audit_model.Base.metadata
    except Exception:
        from sqlalchemy.orm import declarative_base

        Base = declarative_base()
        metadata = Base.metadata

    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)

    Session = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)
    _async_sessionmaker = Session
    return Session


async def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    if _async_sessionmaker is None:
        raise RuntimeError("DB sessionmaker not initialized. Call init_db(database_url) first.")
    return _async_sessionmaker


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    Session = await get_sessionmaker()
    async with Session() as session:
        yield session


async def insert_audit(session_maker: async_sessionmaker[AsyncSession], entry: Dict[str, Any]) -> Dict[str, Any]:
    try:
        from src.models.audit_log import AuditLog  # type: ignore
    except Exception:
        # fallback - create table not present, cannot persist
        raise RuntimeError("AuditLog model could not be imported")

    async with session_maker() as session:
        obj = AuditLog(
            event_type=entry.get("action") or entry.get("event_type") or "audit",
            user_id=entry.get("actor"),
            payload=json.dumps(entry.get("metadata", {})),
            timestamp=entry.get("timestamp") or datetime.utcnow(),
        )
        session.add(obj)
        await session.commit()
        await session.refresh(obj)
        return {"id": getattr(obj, "id", None), "event_type": obj.event_type, "user_id": obj.user_id}


async def fetch_audits(session_maker: async_sessionmaker[AsyncSession], limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    """
    Fetch recent audits with pagination (limit, offset).
    Returns list of dicts: id, timestamp, event_type, payload (parsed JSON), user_id.
    """
    try:
        from src.models.audit_log import AuditLog  # type: ignore
    except Exception:
        raise RuntimeError("AuditLog model could not be imported")

    async with session_maker() as session:
        q = sa_text(
            f"SELECT id, timestamp, event_type, payload, user_id FROM {AuditLog.__tablename__} ORDER BY id DESC LIMIT :lim OFFSET :off"
        )
        res = await session.execute(q.bindparams(lim=limit, off=offset))
        rows = res.fetchall()
        out = []
        for r in rows:
            out.append(
                {
                    "id": r[0],
                    "timestamp": r[1].isoformat() if r[1] else None,
                    "event_type": r[2],
                    "payload": json.loads(r[3] or "{}"),
                    "user_id": r[4],
                }
            )
        return out

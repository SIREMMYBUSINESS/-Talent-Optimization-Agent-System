import asyncio
import json
import pytest
from src import db as dbmod


@pytest.mark.asyncio
async def test_db_init_and_insert_fetch(postgres_container):
    # Convert connection URL to asyncpg-compatible URL inside init_db helper
    # postgres_container is like postgresql://user:pass@host:port/db
    session_maker = await dbmod.init_db(postgres_container)
    # Create an audit entry
    entry = {
        "action": "test_action",
        "actor": "pytest",
        "target": "unit-test",
        "metadata": {"a": 1},
        "timestamp": __import__("datetime").datetime.utcnow(),
    }
    saved = await dbmod.insert_audit(session_maker, entry)
    assert "id" in saved
    # fetch and validate
    rows = await dbmod.fetch_audits(session_maker, limit=10)
    assert isinstance(rows, list)
    assert any(r["action"] == "test_action" for r in rows)

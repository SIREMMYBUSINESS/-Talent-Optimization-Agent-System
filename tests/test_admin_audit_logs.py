import asyncio
import os
import pytest

from src.utils.audit_logger import AuditLogger
from src import db as dbmod
from src.main import app as main_app

@pytest.mark.asyncio
async def test_admin_audit_logs_endpoint(async_client, tmp_path):
    # Initialize an in-memory SQLite DB and wire AuditLogger to it
    database_url = "sqlite+aiosqlite:///:memory:"
    session_maker = await dbmod.init_db(database_url)

    # Initialize audit logger and assign session_maker directly
    logger = AuditLogger(path=str(tmp_path / "audit.log"), webhook="", database_url=database_url)
    logger._session_maker = session_maker

    # Insert a couple of audit entries synchronously via the logger
    await logger.log("test_event_1", "tester", "target1", {"a": 1})
    await logger.log("test_event_2", "tester", "target2", {"b": 2})
    # tiny sleep to ensure DB commits
    await asyncio.sleep(0.05)

    # Override JWKS/get_current_user dependency to grant admin access for the test
    async def _dummy_user():
        return {"sub": "admin-test", "roles": ["admin", "auditor"]}

    from src.auth.jwks_middleware import get_current_user  # noqa: E402
    main_app.dependency_overrides[get_current_user] = _dummy_user

    # Also ensure the running app's audit_logger uses the session_maker
    # (the app imports a module-level audit_logger instance)
    from src import main as main_mod

    main_mod.audit_logger._session_maker = session_maker

    # Call the endpoint
    resp = await async_client.get("/admin/audit-logs")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data and isinstance(data["items"], list)
    # entries should include our events
    found_names = [it["event_type"] for it in data["items"]]
    assert "test_event_1" in found_names or "test_event_2" in found_names

    # cleanup override
    main_app.dependency_overrides.pop(get_current_user, None)

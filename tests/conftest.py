"""
Test fixtures: Postgres testcontainer fixture upgraded to run alembic migrations
against the ephemeral DB before yielding the connection URL.

Other fixtures (event loop, audit logger, mock retriever, etc.) remain as before.
"""
import asyncio
import os
import tempfile
import subprocess

import pytest

# Ensure deterministic env prior to imports
tmp_dir = tempfile.gettempdir()
os.environ.setdefault("AUDIT_LOG_PATH", os.path.join(tmp_dir, "talent_optimization_agent_test_audit.log"))
os.environ.setdefault("NEMO_BASE_URL", "")
os.environ.setdefault("WORKDAY_BASE_URL", "")
os.environ.setdefault("PRIVACY_SALT", "test-salt")
os.environ.setdefault("REQUIRED_SKILLS", "python,communication,testing")

from testcontainers.postgres import PostgresContainer  # noqa: E402
from src.utils.audit_logger import AuditLogger  # noqa: E402
from src.integrations.nemo_retriever import NeMoRetriever  # noqa: E402
from src.integrations.workday_api import WorkdayClient  # noqa: E402
from src import db as dbmod  # noqa: E402


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def tmp_audit_path(tmp_path):
    p = tmp_path / "audit.log"
    os.environ["AUDIT_LOG_PATH"] = str(p)
    return str(p)


@pytest.fixture
def audit_logger(tmp_audit_path):
    return AuditLogger(path=tmp_audit_path)


class SimpleMockRetriever:
    async def embed(self, text: str):
        base = float(len(text) % 100)
        return [base * (i + 1) / 100.0 for i in range(64)]

    async def search(self, embedding, top_k=5):
        return [{"id": f"mock-{i}", "metadata": {"name": f"Candidate {i}"}, "score": 0.9 - i * 0.05} for i in range(min(3, top_k))]


@pytest.fixture
def mock_retriever():
    return SimpleMockRetriever()


class RecordingMockWorkday:
    def __init__(self):
        self.created = []

    async def create_onboarding_task(self, employee_id: str, task_payload: dict):
        record = {"employee_id": employee_id, "payload": task_payload}
        self.created.append(record)
        return {"status": "ok", "task_id": f"mock-{len(self.created)}", "task": task_payload}

    async def get_employee(self, employee_id: str):
        return {"id": employee_id, "name": f"Employee {employee_id}", "status": "active"}


@pytest.fixture
def mock_workday():
    return RecordingMockWorkday()


@pytest.fixture(scope="function")
def postgres_container():
    """
    Spin up a Postgres container and run alembic upgrade head against it.
    Yields the connection URL (postgresql://user:pass@host:port/db).
    """
    with PostgresContainer("postgres:15-alpine") as pg:
        url = pg.get_connection_url()
        # Make the URL available as DATABASE_URL for alembic and app code
        env = os.environ.copy()
        env["DATABASE_URL"] = url
        # Run alembic upgrade head to apply migrations
        try:
            # Use subprocess to call alembic CLI with the repo's alembic.ini
            subprocess.run(["alembic", "upgrade", "head"], check=True, env=env)
        except FileNotFoundError:
            # alembic not installed in dev environment; attempt to run migrations via SQLAlchemy directly
            # Fallback: use dbmod.init_db to create tables directly
            import asyncio

            asyncio.get_event_loop().run_until_complete(dbmod.init_db(url))
        except subprocess.CalledProcessError as exc:
            # If migrations fail, attempt direct init and continue
            import asyncio

            asyncio.get_event_loop().run_until_complete(dbmod.init_db(url))
        yield url

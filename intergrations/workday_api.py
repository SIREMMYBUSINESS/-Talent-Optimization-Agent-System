"""
Async Workday integration (mock-friendly).

When WORKDAY_BASE_URL is configured, this client will:
  - POST {base_url}/oauth/token  (client credentials) -> {"access_token": "...", "expires_in": n}
  - POST {base_url}/api/onboarding/tasks -> task creation

When not configured, it will behave as a local in-memory mock that
returns deterministic responses.
"""
from __future__ import annotations

import asyncio
import os
import time
from typing import Any, Dict, Optional

import httpx

WORKDAY_BASE_URL = os.environ.get("WORKDAY_BASE_URL", "")
WORKDAY_CLIENT_ID = os.environ.get("WORKDAY_CLIENT_ID", "")
WORKDAY_CLIENT_SECRET = os.environ.get("WORKDAY_CLIENT_SECRET", "")
WORKDAY_TOKEN_URL = os.environ.get("WORKDAY_TOKEN_URL", "")  # optional override

# in-memory mock store (used when WORKDAY_BASE_URL is not set)
_mock_store: Dict[str, Any] = {"tasks": []}


class WorkdayClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        token_url: Optional[str] = None,
    ) -> None:
        self.base_url = (base_url or WORKDAY_BASE_URL).rstrip("/") if (base_url or WORKDAY_BASE_URL) else ""
        self.client_id = client_id or WORKDAY_CLIENT_ID
        self.client_secret = client_secret or WORKDAY_CLIENT_SECRET
        self.token_url = token_url or WORKDAY_TOKEN_URL
        self._token: Optional[str] = None
        self._token_expiry: float = 0.0
        self._client: Optional[httpx.AsyncClient] = None
        self._lock = asyncio.Lock()

    async def _ensure_client(self) -> httpx.AsyncClient:
        if not self._client:
            self._client = httpx.AsyncClient(timeout=10.0)
        return self._client

    async def _obtain_token(self) -> None:
        # If not configured to use real Workday, skip remote token acquisition
        if not self.base_url:
            # mock token that never expires (for in-memory mock)
            self._token = "mock-token"
            self._token_expiry = time.time() + 3600 * 24
            return

        if self._token and time.time() < self._token_expiry - 30:
            return

        async with self._lock:
            if self._token and time.time() < self._token_expiry - 30:
                return
            # Determine token endpoint
            token_url = self.token_url or f"{self.base_url}/oauth/token"
            client = await self._ensure_client()
            resp = await client.post(
                token_url,
                data={"grant_type": "client_credentials"},
                auth=(self.client_id, self.client_secret),
            )
            resp.raise_for_status()
            data = resp.json()
            self._token = data["access_token"]
            self._token_expiry = time.time() + int(data.get("expires_in", 3600))

    async def _headers(self) -> Dict[str, str]:
        await self._obtain_token()
        return {"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"}

    async def create_onboarding_task(self, employee_id: str, task_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create an onboarding task in Workday or in the local mock.
        Returns the created task or raises an exception on remote errors.
        """
        if not self.base_url:
            # create in mock store
            task_id = f"mock-task-{len(_mock_store['tasks']) + 1}"
            record = {
                "id": task_id,
                "employee_id": employee_id,
                "payload": task_payload,
                "created_at": time.time(),
            }
            _mock_store["tasks"].append(record)
            # simulate async latency
            await asyncio.sleep(0.05)
            return {"status": "ok", "task": record}

        client = await self._ensure_client()
        headers = await self._headers()
        resp = await client.post(f"{self.base_url}/api/onboarding/tasks", json=task_payload, headers=headers)
        resp.raise_for_status()
        return resp.json()

    async def get_employee(self, employee_id: str) -> Optional[Dict[str, Any]]:
        if not self.base_url:
            # return a mock employee record
            await asyncio.sleep(0.02)
            return {"id": employee_id, "name": f"Employee {employee_id}", "status": "active"}
        client = await self._ensure_client()
        headers = await self._headers()
        resp = await client.get(f"{self.base_url}/api/employees/{employee_id}", headers=headers)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

import httpx
import pytest
from src.main import app


@pytest.mark.asyncio
async def test_protected_endpoints_require_auth(async_client, admin_token, user_token):
    # /onboard should require admin/hr role
    payload = {"employee_id": "emp-1", "start_date": "2030-01-01"}

    # no token -> 401
    r = await async_client.post("/onboard", json=payload)
    assert r.status_code == 401

    # regular user token -> 403
    r2 = await async_client.post("/onboard", json=payload, headers={"Authorization": f"Bearer {user_token}"})
    assert r2.status_code == 403

    # admin token -> 200
    r3 = await async_client.post("/onboard", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert r3.status_code == 200

    # /audit endpoint: requires auth too
    files = {"file": ("r.txt", b"Right to work", "text/plain")}
    r4 = await async_client.post("/audit", files=files, headers={"Authorization": f"Bearer {admin_token}"})
    assert r4.status_code == 200

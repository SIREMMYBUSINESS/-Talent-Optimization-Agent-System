import io
import json
from datetime import datetime, timedelta
import os
import pytest


@pytest.mark.asyncio
async def test_screen_endpoint(async_client, tmp_path):
    # prepare a simple resume content (txt)
    content = "Jane Doe\nExperienced Python developer\nSkills: Python, Communication\nRight to work in USA"
    files = {"file": ("resume.txt", content.encode("utf-8"), "text/plain")}
    data = {"role_description": "Senior Python engineer with strong communication skills"}

    resp = await async_client.post("/screen", files=files, data=data)
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert "score" in payload
    assert isinstance(payload["matched_skills"], list)
    assert isinstance(payload["search_matches"], list)
    # score must be between 0 and 1
    assert 0.0 <= payload["score"] <= 1.0


@pytest.mark.asyncio
async def test_audit_endpoint_basic(async_client):
    # resume missing certifications (simple case)
    content = "John Tester\nExperienced in testing\nNo certifications listed\nRight to work"
    files = {"file": ("audit_resume.txt", content.encode("utf-8"), "text/plain")}

    resp = await async_client.post("/audit", files=files)
    assert resp.status_code == 200, resp.text
    report = resp.json()
    assert "passed" in report and "findings" in report
    # it's allowed to pass or fail depending on rules — ensure structure is correct
    assert isinstance(report["passed"], bool)
    assert isinstance(report["findings"], list)


@pytest.mark.asyncio
async def test_onboard_endpoint_success_and_failure(async_client, tmp_path):
    # success case
    start_date = (datetime.utcnow().date() + timedelta(days=7)).isoformat()
    payload = {"employee_id": "emp-123", "start_date": start_date}
    resp = await async_client.post("/onboard", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["employee_id"] == "emp-123"
    assert "tasks" in data and isinstance(data["tasks"], list)
    # default tasks should exist (four by default)
    assert len(data["tasks"]) >= 1

    # invalid date -> 400
    bad_payload = {"employee_id": "emp-124", "start_date": "not-a-date"}
    resp2 = await async_client.post("/onboard", json=bad_payload)
    assert resp2.status_code == 400


@pytest.mark.asyncio
async def test_audit_log_written(async_client):
    # Ensure that audit entries are written to the configured AUDIT_LOG_PATH
    audit_path = os.environ.get("AUDIT_LOG_PATH")
    # remove existing file if present
    try:
        if audit_path and os.path.exists(audit_path):
            os.remove(audit_path)
    except Exception:
        pass

    # trigger a simple screen request to generate audit entry
    content = "Autolog User\nSkill: Python"
    files = {"file": ("autolog.txt", content.encode("utf-8"), "text/plain")}
    resp = await async_client.post("/screen", files=files, data={"role_description": ""})
    assert resp.status_code == 200

    # give a tiny moment for background tasks to flush (webhook is scheduled async)
    await pytest.sleep(0.05)

    assert audit_path is not None
    assert os.path.exists(audit_path)
    # file should contain at least one JSON-line entry
    with open(audit_path, "r", encoding="utf-8") as fh:
        lines = [l.strip() for l in fh.readlines() if l.strip()]
    assert len(lines) >= 1
    # parse first line as JSON to ensure shape
    entry = json.loads(lines[-1])
    assert "action" in entry and "timestamp" in entry

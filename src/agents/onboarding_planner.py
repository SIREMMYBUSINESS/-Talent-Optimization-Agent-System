"""
Async OnboardingPlanner: generates onboarding tasks and submits them to Workday.
Uses the async WorkdayClient and audit-logs the operation.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from src.integrations.workday_api import WorkdayClient
from src.utils.audit_logger import AuditLogger

DEFAULT_TASKS = [
    {"title": "Complete HR paperwork", "days_before_start": 7},
    {"title": "IT: request laptop and access", "days_before_start": 5},
    {"title": "Team introduction", "days_before_start": 0},
    {"title": "First-week 1:1 with manager", "days_before_start": 1},
]


class OnboardingPlanner:
    def __init__(self, workday_client: Optional[WorkdayClient] = None, audit: Optional[AuditLogger] = None) -> None:
        self.workday = workday_client or WorkdayClient()
        self.audit = audit or AuditLogger()

    async def create_plan(self, employee_id: str, start_date: str, custom_tasks: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Create tasks for onboarding and push them to Workday concurrently.
        start_date expected in ISO date "YYYY-MM-DD"
        """
        try:
            start = datetime.fromisoformat(start_date)
        except Exception as exc:
            raise ValueError("start_date must be ISO format YYYY-MM-DD") from exc

        tasks = custom_tasks or DEFAULT_TASKS
        coros = []
        for t in tasks:
            due_date = (start - timedelta(days=t.get("days_before_start", 0))).date().isoformat()
            payload = {
                "title": t["title"],
                "due_date": due_date,
                "assigned_to": employee_id,
                "metadata": {"generated_by": "onboarding_planner"},
            }
            coros.append(self._create_task_safe(employee_id, payload))

        created = await asyncio.gather(*coros)
        await self.audit.log("create_onboarding_plan", "system", employee_id, {"tasks_created": len(created)})
        return {"employee_id": employee_id, "start_date": start_date, "tasks": created}

    async def _create_task_safe(self, employee_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            res = await self.workday.create_onboarding_task(employee_id, payload)
            return {"task": payload, "workday_response": res}
        except Exception as exc:
            return {"task": payload, "error": str(exc)}

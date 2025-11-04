"""
FastAPI application wiring the agents together with async routes,
JWKS-based authentication, DB-init startup hook, an admin SSE stream endpoint,
and an admin paginated audit-logs endpoint.
"""
from __future__ import annotations

import os
import tempfile
from typing import List, Optional, AsyncGenerator

import aiofiles
import uvicorn
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.agents.compliance_auditor import ComplianceAuditor
from src.agents.onboarding_planner import OnboardingPlanner
from src.agents.resume_screener import ResumeScreener
from src.integrations.nemo_retriever import NeMoRetriever
from src.integrations.workday_api import WorkdayClient
from src.utils.audit_logger import AuditLogger
from src.auth.jwks_middleware import jwks_client, get_current_user, require_roles
from src import db as dbmod

# instantiate shared clients (audit_logger initialized with fallback behavior)
audit_logger = AuditLogger()
nemo = NeMoRetriever()
workday = WorkdayClient()

# agents wired with shared clients
screener = ResumeScreener(retriever=nemo, audit=audit_logger)
auditor = ComplianceAuditor(audit=audit_logger)
planner = OnboardingPlanner(workday_client=workday, audit=audit_logger)

app = FastAPI(title="Talent Optimization Agent", version="0.4.0")


class ScreenResponse(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0)
    matched_skills: List[str]
    search_matches: List[dict]


class AuditRequest(BaseModel):
    required_certifications: Optional[List[str]] = None


class OnboardRequest(BaseModel):
    employee_id: str
    start_date: str
    custom_tasks: Optional[List[dict]] = None


async def _save_upload_tmp(file: UploadFile) -> str:
    suffix = os.path.splitext(file.filename)[1] or ""
    fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    try:
        async with aiofiles.open(tmp_path, "wb") as out:
            content = await file.read()
            await out.write(content)
        return tmp_path
    except Exception:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
        raise


@app.on_event("startup")
async def on_startup():
    """
    App startup: if DATABASE_URL exists, initialize DB and wire AuditLogger.
    If it fails, remain operational with file/webhook fallback.
    """
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        return

    try:
        session_maker = await dbmod.init_db(database_url)
        audit_logger._session_maker = session_maker
        audit_logger._database_url = database_url
        # pre-warm DB init
        try:
            await audit_logger._init_db(database_url)
        except Exception:
            pass
    except Exception as exc:
        try:
            await audit_logger.log("db_init_failed", "system", "startup", {"error": str(exc)})
        except Exception:
            print("DB init failed and audit log unavailable:", str(exc))


@app.get("/health")
async def health():
    """
    Health endpoint with JWKS client status and DB availability.
    """
    jwks_status = {}
    try:
        jwks_status = jwks_client.status()
        jwks_status["ok"] = bool(jwks_status.get("cached_keys"))
    except Exception as exc:
        jwks_status = {"ok": False, "error": str(exc)}

    db_status = {"configured": bool(os.environ.get("DATABASE_URL", "").strip()), "ready": False}
    try:
        if os.environ.get("DATABASE_URL", "").strip():
            try:
                _ = await dbmod.get_sessionmaker()
                db_status["ready"] = True
            except Exception:
                db_status["ready"] = False
    except Exception:
        db_status["ready"] = False

    return {"status": "ok", "jwks": jwks_status, "database": db_status}


@app.post("/screen", response_model=ScreenResponse, status_code=status.HTTP_200_OK)
async def screen_resume(role_description: str = Form(""), file: UploadFile = File(...)):
    tmp_path = None
    try:
        tmp_path = await _save_upload_tmp(file)
        result = await screener.screen(tmp_path, role_description)
        return ScreenResponse(score=result["score"], matched_skills=result["matched_skills"], search_matches=result["search_matches"])
    except Exception as exc:
        await audit_logger.log("screen_resume_error", "api_user", file.filename if file else "unknown", {"error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Failed to screen resume: {str(exc)}")
    finally:
        if tmp_path:
            try:
                os.remove(tmp_path)
            except Exception:
                pass


@app.post("/audit", status_code=status.HTTP_200_OK, dependencies=[Depends(require_roles("admin", "hr"))])
async def audit_resume(file: UploadFile = File(...), body: AuditRequest = Depends(), user=Depends(get_current_user)):
    tmp_path = None
    try:
        tmp_path = await _save_upload_tmp(file)
        raw_text = await ResumeScreener().parse_resume(tmp_path)
        report = await auditor.audit_resume(raw_text, required_certifications=body.required_certifications)
        return report
    except Exception as exc:
        await audit_logger.log("audit_resume_error", user.get("sub", "unknown") if user else "api_user", file.filename if file else "unknown", {"error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Failed to audit resume: {str(exc)}")
    finally:
        if tmp_path:
            try:
                os.remove(tmp_path)
            except Exception:
                pass


@app.post("/onboard", status_code=status.HTTP_200_OK, dependencies=[Depends(require_roles("admin", "hr"))])
async def create_onboarding_plan(req: OnboardRequest, user=Depends(get_current_user)):
    try:
        plan = await planner.create_plan(req.employee_id, req.start_date, custom_tasks=req.custom_tasks)
        return plan
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        await audit_logger.log("onboard_error", user.get("sub", "api_user") if user else "api_user", req.employee_id, {"error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Failed to create onboarding plan: {str(exc)}")


@app.get("/admin/audit-logs", dependencies=[Depends(require_roles("admin", "auditor"))])
async def admin_audit_logs(limit: int = Query(50, ge=1, le=1000), offset: int = Query(0, ge=0), user=Depends(get_current_user)):
    """
    Admin endpoint to retrieve recent audit logs.

    Protected by JWKS role guard (admin/auditor).
    Pagination via limit & offset.
    """
    try:
        session_maker = await dbmod.get_sessionmaker()
    except Exception:
        raise HTTPException(status_code=503, detail="Database not initialized")

    rows = await dbmod.fetch_audits(session_maker, limit=limit, offset=offset)
    return {"items": rows, "limit": limit, "offset": offset}


@app.get("/admin/audit-logs/stream", dependencies=[Depends(require_roles("admin", "auditor"))])
async def admin_audit_logs_stream(user=Depends(get_current_user)):
    """
    Server-Sent Events (SSE) endpoint streaming audit events live.
    Each event is sent as a JSON payload in the 'data:' field.
    Protected by JWKS role guard (admin/auditor).
    """

    async def event_generator() -> AsyncGenerator[bytes, None]:
        # Subscribe to audit_logger events (yields dicts)
        try:
            async for evt in audit_logger.subscribe():
                # format as SSE "data: <json>\n\n"
                try:
                    data = json.dumps(evt, ensure_ascii=False)
                except Exception:
                    data = json.dumps({"error": "serialization_error"})
                yield f"data: {data}\n\n".encode("utf-8")
        except asyncio.CancelledError:
            # client disconnected
            return
        except Exception:
            return

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, log_level="info")

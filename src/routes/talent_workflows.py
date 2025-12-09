"""
Talent workflow API endpoints for candidates, job postings, applications, and screening.
Integrates with Supabase for persistence and AI agents for processing.
"""
from __future__ import annotations

import os
import tempfile
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field, EmailStr

from src.agents.resume_screener import ResumeScreener
from src.agents.compliance_auditor import ComplianceAuditor
from src.auth.jwks_middleware import get_current_user, require_roles
from src.integrations.nemo_retriever import NeMoRetriever
from src.utils.audit_logger import AuditLogger
from src.lib.supabase import get_supabase_client

router = APIRouter(prefix="/api/v1", tags=["talent-workflows"])

audit_logger = AuditLogger()
nemo = NeMoRetriever()
screener = ResumeScreener(retriever=nemo, audit=audit_logger)
auditor = ComplianceAuditor(audit=audit_logger)


class CandidateCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    skills: Optional[List[str]] = []
    experience_years: Optional[int] = 0
    education: Optional[List[Dict[str, Any]]] = []
    source: Optional[str] = "direct_application"


class CandidateUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    education: Optional[List[Dict[str, Any]]] = None


class JobPostingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    requirements: Optional[Dict[str, Any]] = {}
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: str = "full-time"
    salary_range: Optional[Dict[str, Any]] = {}
    status: str = "draft"


class JobPostingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[Dict[str, Any]] = None
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    salary_range: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class ApplicationCreate(BaseModel):
    job_posting_id: str
    candidate_id: str
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class ScreeningRequest(BaseModel):
    application_id: str
    required_certifications: Optional[List[str]] = None


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


@router.post("/candidates", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("admin", "hr_manager", "recruiter"))])
async def create_candidate(candidate: CandidateCreate, user=Depends(get_current_user)):
    """Create a new candidate record"""
    try:
        supabase = get_supabase_client()

        data = {
            "full_name": candidate.full_name,
            "email": candidate.email,
            "phone": candidate.phone,
            "linkedin_url": candidate.linkedin_url,
            "skills": candidate.skills or [],
            "experience_years": candidate.experience_years or 0,
            "education": candidate.education or [],
            "source": candidate.source or "direct_application",
        }

        result = supabase.table("candidates").insert(data).execute()

        if result.data and len(result.data) > 0:
            await audit_logger.log("candidate_created", user.get("sub", "unknown"), candidate.email, {"candidate_id": result.data[0]["id"]})
            return result.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create candidate")

    except Exception as exc:
        await audit_logger.log("candidate_create_error", user.get("sub", "unknown"), candidate.email, {"error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Failed to create candidate: {str(exc)}")


@router.get("/candidates", dependencies=[Depends(get_current_user)])
async def list_candidates(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    source: Optional[str] = None,
    user=Depends(get_current_user)
):
    """List candidates with pagination and optional filtering"""
    try:
        supabase = get_supabase_client()

        query = supabase.table("candidates").select("*")

        if source:
            query = query.eq("source", source)

        query = query.range(offset, offset + limit - 1).order("created_at", desc=True)
        result = query.execute()

        return {"items": result.data or [], "limit": limit, "offset": offset}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch candidates: {str(exc)}")


@router.get("/candidates/{candidate_id}", dependencies=[Depends(get_current_user)])
async def get_candidate(candidate_id: str, user=Depends(get_current_user)):
    """Get a single candidate by ID"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("candidates").select("*").eq("id", candidate_id).maybeSingle().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Candidate not found")

        return result.data

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch candidate: {str(exc)}")


@router.patch("/candidates/{candidate_id}", dependencies=[Depends(require_roles("admin", "hr_manager", "recruiter"))])
async def update_candidate(candidate_id: str, updates: CandidateUpdate, user=Depends(get_current_user)):
    """Update candidate information"""
    try:
        supabase = get_supabase_client()

        data = {}
        if updates.full_name is not None:
            data["full_name"] = updates.full_name
        if updates.phone is not None:
            data["phone"] = updates.phone
        if updates.linkedin_url is not None:
            data["linkedin_url"] = updates.linkedin_url
        if updates.skills is not None:
            data["skills"] = updates.skills
        if updates.experience_years is not None:
            data["experience_years"] = updates.experience_years
        if updates.education is not None:
            data["education"] = updates.education

        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")

        data["updated_at"] = datetime.utcnow().isoformat()

        result = supabase.table("candidates").update(data).eq("id", candidate_id).execute()

        if result.data and len(result.data) > 0:
            await audit_logger.log("candidate_updated", user.get("sub", "unknown"), candidate_id, {"updates": list(data.keys())})
            return result.data[0]
        else:
            raise HTTPException(status_code=404, detail="Candidate not found")

    except HTTPException:
        raise
    except Exception as exc:
        await audit_logger.log("candidate_update_error", user.get("sub", "unknown"), candidate_id, {"error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Failed to update candidate: {str(exc)}")


@router.post("/candidates/{candidate_id}/upload-resume", dependencies=[Depends(require_roles("admin", "hr_manager", "recruiter"))])
async def upload_candidate_resume(candidate_id: str, file: UploadFile = File(...), user=Depends(get_current_user)):
    """Upload and parse resume for a candidate"""
    tmp_path = None
    try:
        supabase = get_supabase_client()

        candidate_result = supabase.table("candidates").select("id, email").eq("id", candidate_id).maybeSingle().execute()
        if not candidate_result.data:
            raise HTTPException(status_code=404, detail="Candidate not found")

        tmp_path = await _save_upload_tmp(file)
        raw_text = await screener.parse_resume(tmp_path)

        update_data = {
            "resume_text": raw_text,
            "updated_at": datetime.utcnow().isoformat()
        }

        result = supabase.table("candidates").update(update_data).eq("id", candidate_id).execute()

        await audit_logger.log("resume_uploaded", user.get("sub", "unknown"), candidate_id, {"filename": file.filename})

        return {"message": "Resume uploaded and parsed successfully", "candidate": result.data[0] if result.data else None}

    except HTTPException:
        raise
    except Exception as exc:
        await audit_logger.log("resume_upload_error", user.get("sub", "unknown"), candidate_id, {"error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Failed to upload resume: {str(exc)}")
    finally:
        if tmp_path:
            try:
                os.remove(tmp_path)
            except Exception:
                pass


@router.post("/jobs", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("admin", "hr_manager", "recruiter"))])
async def create_job_posting(job: JobPostingCreate, user=Depends(get_current_user)):
    """Create a new job posting"""
    try:
        supabase = get_supabase_client()

        data = {
            "title": job.title,
            "description": job.description,
            "requirements": job.requirements or {},
            "department": job.department,
            "location": job.location,
            "employment_type": job.employment_type,
            "salary_range": job.salary_range or {},
            "status": job.status,
            "posted_by": user.get("sub"),
        }

        result = supabase.table("job_postings").insert(data).execute()

        if result.data and len(result.data) > 0:
            await audit_logger.log("job_created", user.get("sub", "unknown"), job.title, {"job_id": result.data[0]["id"]})
            return result.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create job posting")

    except Exception as exc:
        await audit_logger.log("job_create_error", user.get("sub", "unknown"), job.title, {"error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Failed to create job posting: {str(exc)}")


@router.get("/jobs", dependencies=[Depends(get_current_user)])
async def list_job_postings(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None,
    department: Optional[str] = None,
    user=Depends(get_current_user)
):
    """List job postings with pagination and optional filtering"""
    try:
        supabase = get_supabase_client()

        query = supabase.table("job_postings").select("*")

        if status:
            query = query.eq("status", status)
        if department:
            query = query.eq("department", department)

        query = query.range(offset, offset + limit - 1).order("created_at", desc=True)
        result = query.execute()

        return {"items": result.data or [], "limit": limit, "offset": offset}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch job postings: {str(exc)}")


@router.get("/jobs/{job_id}", dependencies=[Depends(get_current_user)])
async def get_job_posting(job_id: str, user=Depends(get_current_user)):
    """Get a single job posting by ID"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("job_postings").select("*").eq("id", job_id).maybeSingle().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Job posting not found")

        return result.data

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch job posting: {str(exc)}")


@router.patch("/jobs/{job_id}", dependencies=[Depends(require_roles("admin", "hr_manager", "recruiter"))])
async def update_job_posting(job_id: str, updates: JobPostingUpdate, user=Depends(get_current_user)):
    """Update job posting information"""
    try:
        supabase = get_supabase_client()

        data = {}
        if updates.title is not None:
            data["title"] = updates.title
        if updates.description is not None:
            data["description"] = updates.description
        if updates.requirements is not None:
            data["requirements"] = updates.requirements
        if updates.department is not None:
            data["department"] = updates.department
        if updates.location is not None:
            data["location"] = updates.location
        if updates.employment_type is not None:
            data["employment_type"] = updates.employment_type
        if updates.salary_range is not None:
            data["salary_range"] = updates.salary_range
        if updates.status is not None:
            data["status"] = updates.status
            if updates.status == "closed":
                data["closed_at"] = datetime.utcnow().isoformat()

        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")

        data["updated_at"] = datetime.utcnow().isoformat()

        result = supabase.table("job_postings").update(data).eq("id", job_id).execute()

        if result.data and len(result.data) > 0:
            await audit_logger.log("job_updated", user.get("sub", "unknown"), job_id, {"updates": list(data.keys())})
            return result.data[0]
        else:
            raise HTTPException(status_code=404, detail="Job posting not found")

    except HTTPException:
        raise
    except Exception as exc:
        await audit_logger.log("job_update_error", user.get("sub", "unknown"), job_id, {"error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Failed to update job posting: {str(exc)}")


@router.post("/applications", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("admin", "hr_manager", "recruiter"))])
async def create_application(application: ApplicationCreate, user=Depends(get_current_user)):
    """Create a new job application"""
    try:
        supabase = get_supabase_client()

        job_result = supabase.table("job_postings").select("id, title").eq("id", application.job_posting_id).maybeSingle().execute()
        if not job_result.data:
            raise HTTPException(status_code=404, detail="Job posting not found")

        candidate_result = supabase.table("candidates").select("id, email").eq("id", application.candidate_id).maybeSingle().execute()
        if not candidate_result.data:
            raise HTTPException(status_code=404, detail="Candidate not found")

        data = {
            "job_posting_id": application.job_posting_id,
            "candidate_id": application.candidate_id,
            "status": "submitted",
            "notes": application.notes,
        }

        result = supabase.table("applications").insert(data).execute()

        if result.data and len(result.data) > 0:
            await audit_logger.log("application_created", user.get("sub", "unknown"), application.candidate_id, {
                "application_id": result.data[0]["id"],
                "job_id": application.job_posting_id
            })
            return result.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create application")

    except HTTPException:
        raise
    except Exception as exc:
        await audit_logger.log("application_create_error", user.get("sub", "unknown"), application.candidate_id, {"error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Failed to create application: {str(exc)}")


@router.get("/applications", dependencies=[Depends(get_current_user)])
async def list_applications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None,
    job_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    user=Depends(get_current_user)
):
    """List applications with pagination and optional filtering"""
    try:
        supabase = get_supabase_client()

        query = supabase.table("applications").select("*, job_postings(title, department), candidates(full_name, email)")

        if status:
            query = query.eq("status", status)
        if job_id:
            query = query.eq("job_posting_id", job_id)
        if candidate_id:
            query = query.eq("candidate_id", candidate_id)

        query = query.range(offset, offset + limit - 1).order("created_at", desc=True)
        result = query.execute()

        return {"items": result.data or [], "limit": limit, "offset": offset}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(exc)}")


@router.get("/applications/{application_id}", dependencies=[Depends(get_current_user)])
async def get_application(application_id: str, user=Depends(get_current_user)):
    """Get a single application by ID with related data"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("applications").select(
            "*, job_postings(*), candidates(*), screening_results(*)"
        ).eq("id", application_id).maybeSingle().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Application not found")

        return result.data

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch application: {str(exc)}")


@router.patch("/applications/{application_id}", dependencies=[Depends(require_roles("admin", "hr_manager", "recruiter"))])
async def update_application(application_id: str, updates: ApplicationUpdate, user=Depends(get_current_user)):
    """Update application status and notes"""
    try:
        supabase = get_supabase_client()

        data = {}
        if updates.status is not None:
            data["status"] = updates.status
        if updates.notes is not None:
            data["notes"] = updates.notes

        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")

        data["updated_at"] = datetime.utcnow().isoformat()
        data["reviewed_by"] = user.get("sub")
        data["reviewed_at"] = datetime.utcnow().isoformat()

        result = supabase.table("applications").update(data).eq("id", application_id).execute()

        if result.data and len(result.data) > 0:
            await audit_logger.log("application_updated", user.get("sub", "unknown"), application_id, {"updates": list(data.keys())})
            return result.data[0]
        else:
            raise HTTPException(status_code=404, detail="Application not found")

    except HTTPException:
        raise
    except Exception as exc:
        await audit_logger.log("application_update_error", user.get("sub", "unknown"), application_id, {"error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Failed to update application: {str(exc)}")


@router.post("/applications/{application_id}/screen", dependencies=[Depends(require_roles("admin", "hr_manager", "recruiter"))])
async def screen_application(application_id: str, request: ScreeningRequest, user=Depends(get_current_user)):
    """Run AI screening on an application"""
    try:
        supabase = get_supabase_client()

        app_result = supabase.table("applications").select(
            "*, job_postings(title, description, requirements), candidates(resume_text, skills, experience_years)"
        ).eq("id", application_id).maybeSingle().execute()

        if not app_result.data:
            raise HTTPException(status_code=404, detail="Application not found")

        app = app_result.data
        candidate = app.get("candidates", {})
        job = app.get("job_postings", {})

        if not candidate.get("resume_text"):
            raise HTTPException(status_code=400, detail="Candidate has no resume uploaded")

        resume_text = candidate["resume_text"]
        role_description = f"{job.get('title', '')} {job.get('description', '')}"

        audit_report = await auditor.audit_resume(resume_text, required_certifications=request.required_certifications)

        skills_match = {
            "candidate_skills": candidate.get("skills", []),
            "required_skills": job.get("requirements", {}).get("skills", []),
            "matched_count": 0
        }

        experience_match = {
            "candidate_years": candidate.get("experience_years", 0),
            "required_years": job.get("requirements", {}).get("experience_years", 0)
        }

        overall_score = min(100, int((len(skills_match["candidate_skills"]) / max(1, len(skills_match["required_skills"]))) * 100)) if skills_match["required_skills"] else 50

        recommendation = "strong_match" if overall_score >= 80 else "good_match" if overall_score >= 60 else "potential_match" if overall_score >= 40 else "no_match"

        screening_data = {
            "application_id": application_id,
            "overall_score": overall_score,
            "skills_match": skills_match,
            "experience_match": experience_match,
            "education_match": {},
            "ai_summary": audit_report.get("summary", ""),
            "recommendation": recommendation,
            "bias_flags": audit_report.get("bias_flags", []),
            "screened_by_model": "nvidia-nemo",
            "screened_at": datetime.utcnow().isoformat()
        }

        result = supabase.table("screening_results").upsert(screening_data).execute()

        supabase.table("applications").update({"status": "screening"}).eq("id", application_id).execute()

        await audit_logger.log("application_screened", user.get("sub", "unknown"), application_id, {
            "score": overall_score,
            "recommendation": recommendation
        })

        return result.data[0] if result.data else screening_data

    except HTTPException:
        raise
    except Exception as exc:
        await audit_logger.log("screening_error", user.get("sub", "unknown"), application_id, {"error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Failed to screen application: {str(exc)}")


@router.get("/screening-results/{application_id}", dependencies=[Depends(get_current_user)])
async def get_screening_results(application_id: str, user=Depends(get_current_user)):
    """Get screening results for an application"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("screening_results").select("*").eq("application_id", application_id).maybeSingle().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Screening results not found")

        return result.data

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch screening results: {str(exc)}")

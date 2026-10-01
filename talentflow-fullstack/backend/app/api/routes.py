from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from redis import Redis
from rq import Queue
from sqlalchemy.orm import Session

from app.api.dependencies import CurrentUser, DbSession
from app.core.config import settings
from app.models import User
from app.schemas import ApplicationOut, CandidateSkillCreate, CandidateSkillUpdate, LoginRequest, RegisterRequest, ResumeStatusOut, TokenResponse
from app.services import ApplicationService, AuthService, CandidateService, JobService, ResumeService, SavedJobService

router = APIRouter()


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> dict[str, str]:
    return AuthService(db).register(payload.email, payload.password, payload.full_name)


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> dict[str, str]:
    return AuthService(db).login(payload.email, payload.password)


@router.get("/jobs")
def list_jobs(
    db: DbSession,
    user: CurrentUser,
    search: str | None = None,
    technology: str | None = None,
    category: str | None = None,
    location: str | None = None,
    experience: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    candidate = CandidateService(db).get(user)
    jobs = JobService(db).list(candidate, search=search, technology=technology, category=category,
                               location=location, experience=experience, skip=skip, limit=limit)
    return {"jobs": jobs, "skip": skip, "limit": limit, "total": len(jobs)}


@router.get("/jobs/recommended")
def recommended_jobs(db: DbSession, user: CurrentUser, skip: int = Query(default=0, ge=0), limit: int = Query(default=20, ge=1, le=100)) -> dict:
    candidate = CandidateService(db).get(user)
    jobs = JobService(db).list(candidate, skip=skip, limit=limit)
    return {"jobs": jobs, "skip": skip, "limit": limit, "total": len(jobs)}


@router.get("/jobs/saved")
def saved_jobs(db: DbSession, user: CurrentUser) -> dict:
    candidate = CandidateService(db).get(user)
    return {"jobs": SavedJobService(db).list(candidate)}


@router.put("/jobs/{job_id}/saved", status_code=status.HTTP_200_OK)
def save_job(job_id: int, user: CurrentUser, db: DbSession) -> dict[str, bool]:
    SavedJobService(db).save(CandidateService(db).get(user), job_id)
    return {"saved": True}


@router.delete("/jobs/{job_id}/saved", status_code=status.HTTP_200_OK)
def unsave_job(job_id: int, user: CurrentUser, db: DbSession) -> dict[str, bool]:
    SavedJobService(db).remove(CandidateService(db).get(user), job_id)
    return {"saved": False}


@router.get("/jobs/{job_id}")
def get_job(job_id: int, db: DbSession, user: CurrentUser) -> dict:
    candidate = CandidateService(db).get(user)
    return JobService(db).detail(job_id, candidate)


@router.get("/jobs/{job_id}/match")
def get_job_match(job_id: int, db: DbSession, user: CurrentUser) -> dict:
    candidate = CandidateService(db).get(user)
    return JobService(db).match(candidate, job_id)


@router.get("/candidates/me")
def get_candidate(user: CurrentUser, db: DbSession) -> dict:
    return CandidateService(db).output(user)


@router.get("/candidates/me/skills")
def get_candidate_skills(user: CurrentUser, db: DbSession) -> list[dict]:
    return CandidateService(db).skills(user)


@router.post("/candidates/me/skills", status_code=status.HTTP_200_OK)
def add_candidate_skills(payload: CandidateSkillCreate, user: CurrentUser, db: DbSession) -> list[dict]:
    return CandidateService(db).add_skills(user, payload.skills)


@router.put("/candidates/me/skills/{skill_id}")
def update_candidate_skill(skill_id: int, payload: CandidateSkillUpdate, user: CurrentUser, db: DbSession) -> dict:
    return CandidateService(db).update_skill(user, skill_id, payload.name)


@router.delete("/candidates/me/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_candidate_skill(skill_id: int, user: CurrentUser, db: DbSession) -> None:
    CandidateService(db).remove_skill(user, skill_id)


@router.post("/resumes/upload", response_model=ResumeStatusOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_resume(
    user: CurrentUser,
    db: DbSession,
    file: Annotated[UploadFile, File(description="PDF or DOCX resume")],
) -> dict:
    candidate = CandidateService(db).get(user)
    resume = await ResumeService(db).upload(candidate, file)
    queue = Queue("talentflow-resumes", connection=Redis.from_url(settings.redis_url))
    queue.enqueue(ResumeService.process, resume.id, job_timeout=300)
    return {"resume_id": resume.id, "status": resume.status, "original_filename": resume.original_filename}


@router.get("/resumes/status/{resume_id}", response_model=ResumeStatusOut)
def resume_status(resume_id: int, user: CurrentUser, db: DbSession) -> dict:
    candidate = CandidateService(db).get(user)
    resume = ResumeService(db).status(candidate, resume_id)
    return {"resume_id": resume.id, "status": resume.status, "original_filename": resume.original_filename, "error_message": resume.error_message}


@router.post("/jobs/{job_id}/apply", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def apply_to_job(job_id: int, user: CurrentUser, db: DbSession) -> dict:
    candidate = CandidateService(db).get(user)
    application = ApplicationService(db).apply(candidate, job_id)
    return {"success": True, "message": "Application submitted successfully", "application_id": application.id, "status": application.status}

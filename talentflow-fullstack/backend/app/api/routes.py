from typing import Annotated

from fastapi import APIRouter, File, Query, UploadFile, status
from redis import Redis
from rq import Queue

from app.api.dependencies import AdminUser, CurrentUser, DbSession, EmployeeUser, HrUser
from app.core.config import settings
from app.schemas import ApplicationDecisionRequest, ApplicationOut, CandidateSkillCreate, CandidateSkillUpdate, CreateHrRequest, JobCreateRequest, JobUpdateRequest, LoginRequest, LookupCreateRequest, LookupUpdateRequest, MessageCreateRequest, MessageReplyRequest, RegisterRequest, ResumeStatusOut, TokenResponse
from app.services import ApplicationService, AuthService, CandidateService, JobService, ResumeService, SavedJobService, StaffService

router = APIRouter()


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> dict[str, str]:
    return AuthService(db).register(payload.email, payload.password, payload.full_name)


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> dict[str, str]:
    return AuthService(db).login(payload.email, payload.password)


@router.get("/auth/me")
def auth_me(user: CurrentUser) -> dict:
    return {"id": user.id, "email": user.email, "full_name": user.candidate.full_name if user.candidate else user.full_name or user.email,
            "role": "employee" if user.role == "candidate" else user.role}


@router.post("/admin/hr", status_code=status.HTTP_201_CREATED)
def create_hr(payload: CreateHrRequest, admin: AdminUser, db: DbSession) -> dict:
    return AuthService(db).create_hr(payload.email, payload.password, payload.full_name)


@router.get("/jobs")
def list_jobs(
    db: DbSession,
    user: EmployeeUser,
    search: str | None = None,
    technology: str | None = None,
    category: str | None = None,
    experience: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    candidate = CandidateService(db).get(user)
    jobs = JobService(db).list(candidate, search=search, technology=technology, category=category,
                               experience=experience, skip=skip, limit=limit)
    return {"jobs": jobs, "skip": skip, "limit": limit, "total": len(jobs)}


@router.get("/jobs/recommended")
def recommended_jobs(db: DbSession, user: EmployeeUser, skip: int = Query(default=0, ge=0), limit: int = Query(default=20, ge=1, le=100)) -> dict:
    candidate = CandidateService(db).get(user)
    jobs = JobService(db).list(candidate, skip=skip, limit=limit)
    return {"jobs": jobs, "skip": skip, "limit": limit, "total": len(jobs)}


@router.get("/jobs/saved")
def saved_jobs(db: DbSession, user: EmployeeUser) -> dict:
    candidate = CandidateService(db).get(user)
    return {"jobs": SavedJobService(db).list(candidate)}


@router.put("/jobs/{job_id}/saved", status_code=status.HTTP_200_OK)
def save_job(job_id: int, user: EmployeeUser, db: DbSession) -> dict[str, bool]:
    SavedJobService(db).save(CandidateService(db).get(user), job_id)
    return {"saved": True}


@router.delete("/jobs/{job_id}/saved", status_code=status.HTTP_200_OK)
def unsave_job(job_id: int, user: EmployeeUser, db: DbSession) -> dict[str, bool]:
    SavedJobService(db).remove(CandidateService(db).get(user), job_id)
    return {"saved": False}


@router.get("/jobs/{job_id}")
def get_job(job_id: int, db: DbSession, user: EmployeeUser) -> dict:
    candidate = CandidateService(db).get(user)
    return JobService(db).detail(job_id, candidate)


@router.get("/jobs/{job_id}/match")
def get_job_match(job_id: int, db: DbSession, user: EmployeeUser) -> dict:
    candidate = CandidateService(db).get(user)
    return JobService(db).match(candidate, job_id)


@router.get("/candidates/me")
def get_candidate(user: EmployeeUser, db: DbSession) -> dict:
    return CandidateService(db).output(user)


@router.get("/candidates/me/skills")
def get_candidate_skills(user: EmployeeUser, db: DbSession) -> list[dict]:
    return CandidateService(db).skills(user)


@router.post("/candidates/me/skills", status_code=status.HTTP_200_OK)
def add_candidate_skills(payload: CandidateSkillCreate, user: EmployeeUser, db: DbSession) -> list[dict]:
    return CandidateService(db).add_skills(user, payload.skills)


@router.put("/candidates/me/skills/{skill_id}")
def update_candidate_skill(skill_id: int, payload: CandidateSkillUpdate, user: EmployeeUser, db: DbSession) -> dict:
    return CandidateService(db).update_skill(user, skill_id, payload.name)


@router.delete("/candidates/me/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_candidate_skill(skill_id: int, user: EmployeeUser, db: DbSession) -> None:
    CandidateService(db).remove_skill(user, skill_id)


@router.post("/resumes/upload", response_model=ResumeStatusOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_resume(
    user: EmployeeUser,
    db: DbSession,
    file: Annotated[UploadFile, File(description="PDF or DOCX resume")],
) -> dict:
    candidate = CandidateService(db).get(user)
    resume = await ResumeService(db).upload(candidate, file)
    queue = Queue("talentflow-resumes", connection=Redis.from_url(settings.redis_url))
    queue.enqueue(ResumeService.process, resume.id, job_timeout=300)
    return {"resume_id": resume.id, "status": resume.status, "original_filename": resume.original_filename}


@router.get("/resumes/status/{resume_id}", response_model=ResumeStatusOut)
def resume_status(resume_id: int, user: EmployeeUser, db: DbSession) -> dict:
    candidate = CandidateService(db).get(user)
    resume = ResumeService(db).status(candidate, resume_id)
    return {"resume_id": resume.id, "status": resume.status, "original_filename": resume.original_filename, "error_message": resume.error_message}


@router.delete("/resumes/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(resume_id: int, user: EmployeeUser, db: DbSession) -> None:
    candidate = CandidateService(db).get(user)
    ResumeService(db).delete(candidate, resume_id)


@router.post("/jobs/{job_id}/apply", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def apply_to_job(job_id: int, user: EmployeeUser, db: DbSession) -> dict:
    candidate = CandidateService(db).get(user)
    application = ApplicationService(db).apply(candidate, job_id)
    return {"success": True, "message": "Application submitted successfully", "application_id": application.id, "status": application.status}


@router.post("/employee/messages", status_code=status.HTTP_201_CREATED)
def employee_message(payload: MessageCreateRequest, user: EmployeeUser, db: DbSession) -> dict:
    return StaffService(db).create_thread(user, payload.subject, payload.body)


@router.get("/employee/messages")
def employee_messages(user: EmployeeUser, db: DbSession) -> dict:
    return {"threads": StaffService(db).employee_threads(user)}


@router.post("/hr/jobs", status_code=status.HTTP_201_CREATED)
def create_job(payload: JobCreateRequest, user: HrUser, db: DbSession) -> dict:
    return StaffService(db).create_job(user, payload)


@router.get("/hr/categories")
def hr_categories(user: HrUser, db: DbSession) -> list[dict]:
    return StaffService(db).categories()


@router.post("/hr/categories", status_code=status.HTTP_201_CREATED)
def create_job_category(payload: LookupCreateRequest, user: HrUser, db: DbSession) -> dict:
    return StaffService(db).create_category(payload.name)


@router.put("/hr/categories/{category_id}")
def update_job_category(category_id: int, payload: LookupUpdateRequest, user: HrUser, db: DbSession) -> dict:
    return StaffService(db).update_category(category_id, payload.name)


@router.delete("/hr/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_category(category_id: int, user: HrUser, db: DbSession) -> None:
    StaffService(db).delete_category(category_id)


@router.get("/hr/skills")
def hr_skills(user: HrUser, db: DbSession) -> list[dict]:
    return StaffService(db).skills()


@router.post("/hr/skills", status_code=status.HTTP_201_CREATED)
def create_hr_skill(payload: LookupCreateRequest, user: HrUser, db: DbSession) -> dict:
    return StaffService(db).create_skill(payload.name)


@router.put("/hr/skills/{skill_id}")
def update_hr_skill(skill_id: int, payload: LookupUpdateRequest, user: HrUser, db: DbSession) -> dict:
    return StaffService(db).update_skill(skill_id, payload.name)


@router.delete("/hr/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hr_skill(skill_id: int, user: HrUser, db: DbSession) -> None:
    StaffService(db).delete_skill(skill_id)


@router.get("/hr/jobs")
def hr_jobs(user: HrUser, db: DbSession) -> dict:
    return {"jobs": StaffService(db).jobs(user)}


@router.put("/hr/jobs/{job_id}")
def update_job(job_id: int, payload: JobUpdateRequest, user: HrUser, db: DbSession) -> dict:
    return StaffService(db).update_job(user, job_id, payload)


@router.delete("/hr/jobs/{job_id}")
def delete_job(job_id: int, user: HrUser, db: DbSession) -> dict:
    return StaffService(db).delete_job(user, job_id)


@router.put("/hr/applications/{application_id}/status")
def update_application_status(application_id: int, payload: ApplicationDecisionRequest, user: HrUser, db: DbSession) -> dict:
    return StaffService(db).select_employee(user, application_id)


@router.get("/hr/employees")
def hr_employees(user: HrUser, db: DbSession) -> dict:
    return {"employees": StaffService(db).employees()}


@router.get("/hr/messages")
def hr_messages(user: HrUser, db: DbSession) -> dict:
    return {"threads": StaffService(db).hr_threads(user)}


@router.post("/hr/messages/{thread_id}/reply")
def hr_reply(thread_id: int, payload: MessageReplyRequest, user: HrUser, db: DbSession) -> dict:
    return StaffService(db).reply(user, thread_id, payload.body)

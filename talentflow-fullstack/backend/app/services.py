import io
import re
from datetime import datetime, timedelta, timezone

import jwt
from docx import Document
from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models import Application, ApplicationStatusHistory, Candidate, CandidateSkill, Job, JobSkill, MatchResult, Resume, Skill, User
from app.repositories import ApplicationRepository, CandidateRepository, JobRepository, MatchRepository, ResumeRepository, UserRepository
from app.storage import resume_storage


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)

    def register(self, email: str, password: str, full_name: str) -> dict[str, str]:
        normalized_email = email.lower().strip()
        if self.users.by_email(normalized_email):
            raise HTTPException(status_code=409, detail="An account with this email already exists")
        user = self.users.add(User(email=normalized_email, password_hash=hash_password(password), role="candidate"))
        self.db.add(Candidate(user_id=user.id, full_name=full_name.strip()))
        self.db.commit()
        return {"access_token": create_access_token(user.id), "token_type": "bearer"}

    def login(self, email: str, password: str) -> dict[str, str]:
        user = self.users.by_email(email.lower().strip())
        if user is None or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
        return {"access_token": create_access_token(user.id), "token_type": "bearer"}


class MatchingService:
    def __init__(self, db: Session):
        self.db = db
        self.matches = MatchRepository(db)

    def calculate(self, candidate: Candidate, job: Job) -> MatchResult:
        candidate_names = {link.skill.name.casefold() for link in candidate.skills}
        required_links = [link for link in job.required_skills if link.required]
        required_names = [link.skill.name for link in required_links]
        matched = [name for name in required_names if name.casefold() in candidate_names]
        missing = [name for name in required_names if name.casefold() not in candidate_names]
        skill_score = round(100 * len(matched) / len(required_names)) if required_names else 0
        if candidate.years_experience >= job.experience_min:
            experience_score = 100
        elif job.experience_min <= 0:
            experience_score = 100
        else:
            experience_score = max(0, round(100 * candidate.years_experience / job.experience_min))
        technology_terms = ("react", "angular", "node", "python", "java", "azure", "aws", ".net", "sql", "docker", "kubernetes", "typescript")
        tech_required = [name for name in required_names if any(term in name.casefold() for term in technology_terms)]
        tech_score = round(100 * sum(name.casefold() in candidate_names for name in tech_required) / len(tech_required)) if tech_required else skill_score
        role = (candidate.desired_role or "").casefold()
        role_score = 100 if not role or role in job.title.casefold() or role in job.category.casefold() else 50
        education_score = 100 if not job.education_required else (100 if candidate.highest_education and candidate.highest_education.casefold() == job.education_required.casefold() else 0)
        detail = {"required_skills": float(skill_score), "experience": float(experience_score), "technical_stack": float(tech_score), "domain_role": float(role_score), "education": float(education_score)}
        weights = {"required_skills": settings.match_weight_required_skills,
                   "experience": settings.match_weight_experience,
                   "technical_stack": settings.match_weight_technical_stack,
                   "domain_role": settings.match_weight_domain_role,
                   "education": settings.match_weight_education}
        weight_total = sum(weights.values()) or 1
        total = round(sum(detail[key] * weight for key, weight in weights.items()) / weight_total)
        result = self.matches.by_candidate_job(candidate.id, job.id)
        if result is None:
            result = MatchResult(candidate_id=candidate.id, job_id=job.id, score=total, skill_match=skill_score, experience_match=experience_score, technology_match=tech_score, matched_skills=matched, missing_skills=missing, score_details=detail)
            self.matches.save(result)
        else:
            result.score = total; result.skill_match = skill_score; result.experience_match = experience_score
            result.technology_match = tech_score; result.matched_skills = matched; result.missing_skills = missing
            result.score_details = detail; result.calculated_at = datetime.now(timezone.utc)
        return result


class CandidateService:
    def __init__(self, db: Session):
        self.db = db
        self.candidates = CandidateRepository(db)

    def get(self, user: User) -> Candidate:
        candidate = self.candidates.by_user_id(user.id)
        if candidate is None:
            raise HTTPException(status_code=404, detail="Candidate profile not found")
        return candidate

    def output(self, user: User) -> dict:
        candidate = self.get(user)
        latest_resume = max(candidate.resumes, key=lambda item: item.created_at) if candidate.resumes else None
        return {"id": candidate.id, "full_name": candidate.full_name, "years_experience": candidate.years_experience,
                "highest_education": candidate.highest_education, "desired_role": candidate.desired_role,
                "email": user.email, "skills": [link.skill.name for link in candidate.skills],
                "resume": {"status": latest_resume.status} if latest_resume else None}

    def skills(self, user: User) -> list[dict]:
        return [{"id": link.id, "name": link.skill.name} for link in self.get(user).skills]

    def add_skills(self, user: User, names: list[str]) -> list[dict]:
        candidate = self.get(user)
        updated = self.candidates.add_skills(candidate, names)
        self.db.commit()
        return [{"id": link.id, "name": link.skill.name} for link in updated.skills]

    def remove_skill(self, user: User, skill_id: int) -> None:
        candidate = self.get(user)
        if not self.candidates.remove_skill(candidate.id, skill_id):
            raise HTTPException(status_code=404, detail="Candidate skill not found")
        self.db.commit()


class JobService:
    def __init__(self, db: Session):
        self.db = db
        self.jobs = JobRepository(db)
        self.matching = MatchingService(db)

    def output(self, job: Job, candidate: Candidate | None = None) -> dict:
        required = [link.skill.name for link in job.required_skills]
        result = self.matching.calculate(candidate, job) if candidate else None
        if result:
            self.db.flush()
        return {"job_id": job.id, "title": job.title, "company": job.company, "location": job.location,
                "category": job.category, "experience": f"{job.experience_min:g}-{job.experience_max:g} years",
                "employment_type": job.employment_type, "posted_at": job.posted_at, "required_skills": required,
                "description": job.description, "match_score": result.score if result else None,
                "can_apply": bool(result and result.score > 60), "matched_skills": result.matched_skills if result else [],
                "missing_skills": result.missing_skills if result else required,
                "skill_match": result.skill_match if result else None, "experience_match": result.experience_match if result else None,
                "technology_match": result.technology_match if result else None}

    def list(self, candidate: Candidate | None = None, **filters) -> list[dict]:
        result = [self.output(job, candidate) for job in self.jobs.list(**filters)]
        if candidate:
            result.sort(key=lambda item: item["match_score"] or 0, reverse=True)
            self.db.commit()
        return result

    def detail(self, job_id: int, candidate: Candidate | None = None) -> dict:
        job = self.jobs.by_id(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found")
        result = self.output(job, candidate)
        if candidate:
            self.db.commit()
        return result

    def match(self, candidate: Candidate, job_id: int) -> dict:
        job = self.jobs.by_id(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found")
        result = self.matching.calculate(candidate, job)
        self.db.commit()
        return {"job_id": job.id, "match_score": result.score, "can_apply": result.score > 60,
                "matched_skills": result.matched_skills, "missing_skills": result.missing_skills,
                "skill_match": result.skill_match, "experience_match": result.experience_match,
                "technology_match": result.technology_match, "score_details": result.score_details}


class ApplicationService:
    def __init__(self, db: Session):
        self.db = db
        self.jobs = JobRepository(db)
        self.applications = ApplicationRepository(db)
        self.matching = MatchingService(db)

    def apply(self, candidate: Candidate, job_id: int) -> Application:
        job = self.jobs.by_id(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found")
        match = self.matching.calculate(candidate, job)
        if match.score <= 60:
            raise HTTPException(status_code=403, detail="Your match score must be above 60% to apply")
        if self.applications.exists(candidate.id, job.id):
            raise HTTPException(status_code=409, detail="You have already applied to this job")
        application = self.applications.add(Application(candidate_id=candidate.id, job_id=job.id, match_score=match.score, status="APPLIED"))
        self.db.add(ApplicationStatusHistory(application_id=application.id, status="APPLIED"))
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=409, detail="You have already applied to this job") from None
        self.db.refresh(application)
        return application


class ResumeService:
    allowed_extensions = {".pdf", ".doc", ".docx"}

    def __init__(self, db: Session):
        self.db = db
        self.resumes = ResumeRepository(db)

    async def upload(self, candidate: Candidate, upload: UploadFile) -> Resume:
        filename = upload.filename or "resume"
        suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if suffix not in self.allowed_extensions:
            raise HTTPException(status_code=415, detail="Upload a PDF, DOC, or DOCX resume")
        content = await upload.read(settings.max_resume_size_bytes + 1)
        if not content or len(content) > settings.max_resume_size_bytes:
            raise HTTPException(status_code=413, detail="Resume must be non-empty and no larger than the configured limit")
        content_type = upload.content_type or "application/octet-stream"
        key = resume_storage.save(filename, content, content_type)
        resume = self.resumes.add(Resume(candidate_id=candidate.id, original_filename=filename[:255], storage_key=key, content_type=content_type, status="queued"))
        self.db.commit()
        self.db.refresh(resume)
        return resume

    def status(self, candidate: Candidate, resume_id: int) -> Resume:
        resume = self.resumes.by_id_for_candidate(resume_id, candidate.id)
        if resume is None:
            raise HTTPException(status_code=404, detail="Resume not found")
        return resume

    @staticmethod
    def process(resume_id: int) -> None:
        from app.core.database import SessionLocal
        db = SessionLocal()
        try:
            resume = db.get(Resume, resume_id)
            if resume is None:
                return
            resume.status = "processing"
            db.commit()
            extension = resume.original_filename.rsplit(".", 1)[-1].lower()
            if extension == "doc":
                raise ValueError("Legacy DOC parsing is not supported; convert the file to PDF or DOCX")
            content = resume_storage.read(resume.storage_key)
            if extension == "pdf":
                pages = PdfReader(io.BytesIO(content)).pages
                text = "\n".join(page.extract_text() or "" for page in pages)
            else:
                document = Document(io.BytesIO(content))
                text = "\n".join(paragraph.text for paragraph in document.paragraphs)
            resume.extracted_text = text[:1_000_000]
            resume.status = "completed"
            candidate = db.get(Candidate, resume.candidate_id)
            if candidate and text:
                available = db.scalars(select(Skill)).all()
                found = {skill.name.casefold(): skill for skill in available if skill.name.casefold() in text.casefold()}
                for skill in found.values():
                    exists = db.scalar(select(CandidateSkill.id).where(CandidateSkill.candidate_id == candidate.id, CandidateSkill.skill_id == skill.id))
                    if exists is None:
                        db.add(CandidateSkill(candidate_id=candidate.id, skill_id=skill.id))
                experience = re.search(r"(\d+(?:\.\d+)?)\s*\+?\s+years?", text, re.IGNORECASE)
                if experience:
                    candidate.years_experience = float(experience.group(1))
            db.commit()
        except Exception as exc:
            db.rollback()
            resume = db.get(Resume, resume_id)
            if resume:
                resume.status = "failed"; resume.error_message = str(exc)[:1000]; db.commit()
        finally:
            db.close()

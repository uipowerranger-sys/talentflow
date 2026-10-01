from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.models import Application, Candidate, CandidateSkill, Job, JobSkill, MatchResult, Resume, Skill, User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def add(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        return user


class CandidateRepository:
    def __init__(self, db: Session):
        self.db = db

    def by_user_id(self, user_id: int) -> Candidate | None:
        statement = select(Candidate).where(Candidate.user_id == user_id).options(
            selectinload(Candidate.skills).selectinload(CandidateSkill.skill),
            selectinload(Candidate.resumes),
        )
        return self.db.scalar(statement)

    def add_skills(self, candidate: Candidate, names: list[str]) -> Candidate:
        for name in names:
            normalized = name.strip()
            if not normalized:
                continue
            skill = self.db.scalar(select(Skill).where(Skill.name.ilike(normalized)))
            if skill is None:
                skill = Skill(name=normalized)
                self.db.add(skill)
                self.db.flush()
            exists = self.db.scalar(select(CandidateSkill.id).where(
                CandidateSkill.candidate_id == candidate.id,
                CandidateSkill.skill_id == skill.id,
            ))
            if exists is None:
                self.db.add(CandidateSkill(candidate_id=candidate.id, skill_id=skill.id))
        self.db.flush()
        return self.by_user_id(candidate.user_id) or candidate

    def remove_skill(self, candidate_id: int, skill_link_id: int) -> bool:
        link = self.db.scalar(select(CandidateSkill).where(
            CandidateSkill.id == skill_link_id,
            CandidateSkill.candidate_id == candidate_id,
        ))
        if link is None:
            return False
        self.db.delete(link)
        self.db.flush()
        return True


class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, search: str | None = None, technology: str | None = None,
             category: str | None = None,
             experience: str | None = None, skip: int = 0, limit: int = 20) -> list[Job]:
        # Employees can discover only jobs explicitly posted by an HR account.
        # This also hides legacy seed rows already present in persistent databases.
        statement: Select[tuple[Job]] = select(Job).where(
            Job.is_active.is_(True), Job.created_by_user_id.is_not(None)
        ).options(
            selectinload(Job.required_skills).selectinload(JobSkill.skill)
        )
        if search:
            term = f"%{search.strip()}%"
            statement = statement.where(
                Job.title.ilike(term) | Job.description.ilike(term) | Job.category.ilike(term)
                | Job.required_skills.any(JobSkill.skill.has(Skill.name.ilike(term)))
            )
        if technology:
            statement = statement.join(Job.required_skills).join(JobSkill.skill).where(Skill.name.ilike(technology))
        if category:
            statement = statement.where(Job.category.ilike(category))
        if experience:
            experience_range = self._parse_experience_range(experience)
            if experience_range is not None:
                minimum, maximum = experience_range
                statement = statement.where(Job.experience_min <= maximum, Job.experience_max >= minimum)
        return list(self.db.scalars(statement.order_by(Job.posted_at.desc()).offset(skip).limit(min(limit, 100))).unique())

    def by_id(self, job_id: int) -> Job | None:
        return self.db.scalar(select(Job).where(
            Job.id == job_id, Job.is_active.is_(True), Job.created_by_user_id.is_not(None)
        ).options(
            selectinload(Job.required_skills).selectinload(JobSkill.skill)
        ))

    @staticmethod
    def _parse_experience_range(value: str) -> tuple[float, float] | None:
        try:
            years = value.lower().replace("years", "").replace("year", "").strip()
            if "+" in years:
                minimum = float(years.split("+", 1)[0].strip())
                return minimum, float("inf")
            if "-" in years:
                minimum, maximum = years.split("-", 1)
                return float(minimum.strip()), float(maximum.strip())
            exact = float(years)
            return exact, exact
        except (ValueError, IndexError):
            return None


class MatchRepository:
    def __init__(self, db: Session):
        self.db = db

    def by_candidate_job(self, candidate_id: int, job_id: int) -> MatchResult | None:
        return self.db.scalar(select(MatchResult).where(
            MatchResult.candidate_id == candidate_id,
            MatchResult.job_id == job_id,
        ))

    def save(self, result: MatchResult) -> MatchResult:
        self.db.add(result)
        self.db.flush()
        return result


class ApplicationRepository:
    def __init__(self, db: Session):
        self.db = db

    def exists(self, candidate_id: int, job_id: int) -> bool:
        return self.db.scalar(select(Application.id).where(
            Application.candidate_id == candidate_id,
            Application.job_id == job_id,
        )) is not None

    def add(self, application: Application) -> Application:
        self.db.add(application)
        self.db.flush()
        return application


class ResumeRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, resume: Resume) -> Resume:
        self.db.add(resume)
        self.db.flush()
        return resume

    def by_id_for_candidate(self, resume_id: int, candidate_id: int) -> Resume | None:
        return self.db.scalar(select(Resume).where(Resume.id == resume_id, Resume.candidate_id == candidate_id))

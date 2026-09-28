from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=160)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CandidateSkillCreate(BaseModel):
    skills: list[str] = Field(min_length=1, max_length=50)

    @field_validator("skills")
    @classmethod
    def normalize_skills(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(skill.strip() for skill in value if skill.strip()))


class SkillOut(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


class CandidateOut(BaseModel):
    id: int
    full_name: str
    years_experience: float
    highest_education: str | None
    desired_role: str | None
    email: EmailStr
    skills: list[str]


class JobOut(BaseModel):
    job_id: int
    title: str
    company: str
    location: str
    category: str
    experience: str
    employment_type: str
    posted_at: datetime
    required_skills: list[str]
    description: str
    match_score: int | None = None
    can_apply: bool = False
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    skill_match: int | None = None
    experience_match: int | None = None
    technology_match: int | None = None


class MatchOut(BaseModel):
    job_id: int
    match_score: int
    can_apply: bool
    matched_skills: list[str]
    missing_skills: list[str]
    skill_match: int
    experience_match: int
    technology_match: int
    score_details: dict[str, float]


class ResumeStatusOut(BaseModel):
    resume_id: int
    status: str
    original_filename: str
    error_message: str | None = None


class ApplicationOut(BaseModel):
    success: bool = True
    message: str = "Application submitted successfully"
    application_id: int
    status: str

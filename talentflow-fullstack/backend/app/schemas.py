from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=160)


class CreateHrRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    full_name: str = Field(min_length=1, max_length=160)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class JobCreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    company: str = Field(min_length=2, max_length=200)
    location: str = Field(min_length=2, max_length=160)
    category: str = Field(min_length=2, max_length=120)
    employment_type: str = Field(default="Full time", max_length=50)
    experience_min: float = Field(default=0, ge=0, le=60)
    experience_max: float = Field(default=0, ge=0, le=60)
    description: str = Field(min_length=20, max_length=12000)
    required_skills: list[str] = Field(min_length=1, max_length=40)

    @field_validator("required_skills")
    @classmethod
    def normalize_required_skills(cls, value: list[str]) -> list[str]:
        cleaned = list(dict.fromkeys(skill.strip() for skill in value if skill.strip()))
        if not cleaned:
            raise ValueError("At least one required skill must be provided")
        return cleaned

    @model_validator(mode="after")
    def validate_experience_range(self):
        if self.experience_max < self.experience_min:
            raise ValueError("Maximum experience must be greater than or equal to minimum experience")
        return self


class MessageCreateRequest(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=1, max_length=10000)


class MessageReplyRequest(BaseModel):
    body: str = Field(min_length=1, max_length=10000)


class CandidateSkillCreate(BaseModel):
    skills: list[str] = Field(min_length=1, max_length=50)

    @field_validator("skills")
    @classmethod
    def normalize_skills(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(skill.strip() for skill in value if skill.strip()))


class CandidateSkillUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return value.strip()


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

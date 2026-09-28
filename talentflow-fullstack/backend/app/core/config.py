from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "TalentFlow API"
    environment: str = "development"
    api_prefix: str = "/api"
    database_url: str = "postgresql+psycopg://talentflow:talentflow@localhost:5432/talentflow"
    jwt_secret_key: str = "replace-this-before-deploying"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: str = "http://localhost:5173"
    resume_storage_dir: str = "./var/resumes"
    azure_storage_connection_string: str = ""
    azure_resume_container: str = "resumes"
    max_resume_size_bytes: int = 10 * 1024 * 1024
    redis_url: str = "redis://localhost:6379/0"
    match_weight_required_skills: float = 0.40
    match_weight_experience: float = 0.25
    match_weight_technical_stack: float = 0.20
    match_weight_domain_role: float = 0.10
    match_weight_education: float = 0.05

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql+psycopg://", 1)
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

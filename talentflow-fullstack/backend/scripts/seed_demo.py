from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import Job, JobSkill, Skill

JOBS = [
    ("Senior React Developer", "Orbit Digital", "Bengaluru", "Frontend Development", 6, 8, "Full time", ["React", "TypeScript", "Node.js", "Redux", "Azure"]),
    ("Full Stack Engineer", "Northstar Labs", "Remote", "Full Stack Development", 3, 5, "Full time", ["React", "Python", "FastAPI", "AWS"]),
    ("Product UI Engineer", "Vertex Systems", "Dubai", "UI Development", 3, 5, "Full time", ["React", "JavaScript", "CSS", "Figma"]),
    ("Data Platform Engineer", "DataGrid", "Hyderabad", "Data Engineering", 6, 8, "Full time", ["Python", "Azure", "SQL", "Databricks"]),
    ("Backend Python Engineer", "Cedar Peak Technologies", "Abu Dhabi", "Backend Development", 4, 6, "Full time", ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"]),
    ("Cloud DevOps Engineer", "Meridian Cloud", "Remote", "DevOps", 5, 7, "Contract", ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"]),
    ("Java Software Engineer", "Harborline Financial", "Dubai", "Software Development", 2, 4, "Full time", ["Java", "Spring Boot", "REST APIs", "SQL"]),
    ("Angular Frontend Developer", "Bluejay Commerce", "Bengaluru", "UI Development", 3, 5, "Full time", ["Angular", "TypeScript", "RxJS", "HTML", "CSS"]),
    ("Azure Data Engineer", "Summit Analytics", "Hyderabad", "Data Engineering", 5, 8, "Full time", ["Azure", "Python", "SQL", "ADF", "Spark"]),
    ("Node.js API Developer", "Kiteworks Studio", "Remote", "Backend Development", 2, 4, "Full time", ["Node.js", "TypeScript", "Express", "MongoDB", "AWS"]),
]


def main() -> None:
    with SessionLocal() as db:
        for title, company, location, category, min_years, max_years, employment, names in JOBS:
            existing = db.scalar(select(Job).where(Job.title == title, Job.company == company))
            if existing:
                continue
            job = Job(title=title, company=company, location=location, category=category,
                      experience_min=min_years, experience_max=max_years, employment_type=employment,
                      posted_at=datetime.now(timezone.utc), description=f"Join {company} to build and deliver thoughtful technology solutions.")
            db.add(job)
            db.flush()
            for name in names:
                skill = db.scalar(select(Skill).where(Skill.name.ilike(name)))
                if skill is None:
                    skill = Skill(name=name)
                    db.add(skill)
                    db.flush()
                db.add(JobSkill(job_id=job.id, skill_id=skill.id, required=True))
        db.commit()
    print("Demo job records are ready.")


if __name__ == "__main__":
    main()

import os

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import User


def main() -> None:
    email = os.getenv("INITIAL_ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("INITIAL_ADMIN_PASSWORD", "")
    full_name = os.getenv("INITIAL_ADMIN_NAME", "TalentFlow Administrator").strip()
    if not email and not password:
        print("Initial admin bootstrap skipped; INITIAL_ADMIN_EMAIL/PASSWORD are not set.")
        return
    if not email or len(password) < 12:
        raise RuntimeError("Set INITIAL_ADMIN_EMAIL and an INITIAL_ADMIN_PASSWORD of at least 12 characters")
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user:
            if user.role != "admin":
                raise RuntimeError("INITIAL_ADMIN_EMAIL already belongs to a non-admin account")
            print("Configured initial admin account already exists.")
            return
        db.add(User(email=email, full_name=full_name, password_hash=hash_password(password), role="admin"))
        db.commit()
    print("Initial admin account created.")


if __name__ == "__main__":
    main()

import getpass

from database import SessionLocal
from models import User
from auth import hash_password


def create_admin():
    db = SessionLocal()

    try:
        username = input("Admin username: ").strip()
        email = input("Admin email: ").strip()
        password = getpass.getpass("Admin password: ")

        if not username or not email or not password:
            print("Username, email and password are required.")
            return

        if len(password) < 12:
            print("Password must contain at least 12 characters.")
            return

        existing_user = (
            db.query(User)
            .filter(
                (User.username == username)
                | (User.email == email)
            )
            .first()
        )

        if existing_user:
            print("Username or email already exists.")
            return

        admin = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            is_active=1,
        )

        db.add(admin)
        db.commit()

        print("Admin account created successfully.")

    except Exception:
        db.rollback()
        print("Failed to create admin account.")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
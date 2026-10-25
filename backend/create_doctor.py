import getpass

from database import SessionLocal
from models import User, Doctor
from auth import hash_password


def create_doctor():
    db = SessionLocal()

    try:
        print("=== Create Doctor Account ===")

        username = input("Doctor username: ").strip()
        email = input("Doctor email: ").strip()
        password = getpass.getpass("Doctor password: ")
        full_name = input("Doctor full name: ").strip()
        specialization = input("Specialization: ").strip()
        license_number = input("License number: ").strip()
        phone = input("Phone: ").strip()
        department = input("Department: ").strip()

        if not all([
            username,
            email,
            password,
            full_name,
            specialization,
            license_number,
        ]):
            print("Required fields cannot be empty.")
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

        existing_doctor = (
            db.query(Doctor)
            .filter(Doctor.license_number == license_number)
            .first()
        )

        if existing_doctor:
            print("License number already exists.")
            return

        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role="doctor",
            is_active=1,
        )

        db.add(user)
        db.flush()

        doctor = Doctor(
            user_id=user.id,
            full_name=full_name,
            specialization=specialization,
            license_number=license_number,
            phone=phone or None,
            department=department or None,
        )

        db.add(doctor)
        db.commit()

        print("Doctor account and profile created successfully.")

    except Exception as exc:
        db.rollback()
        print(f"Failed to create doctor account: {exc}")

    finally:
        db.close()


if __name__ == "__main__":
    create_doctor()
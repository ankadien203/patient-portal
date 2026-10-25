import getpass

from database import SessionLocal
from models import User, Patient, PatientAccount
from auth import hash_password


def create_patient_account():
    db = SessionLocal()

    try:
        print("=== Create Patient Account ===")

        patient_id_input = input("Patient ID [3]: ").strip()
        patient_id = int(patient_id_input or "3")

        username = input("Username: ").strip()
        email = input("Email: ").strip()
        password = getpass.getpass("Password (minimum 12 characters): ")

        if not username or not email or not password:
            print("Username, email and password are required.")
            return

        if len(password) < 12:
            print("Password must contain at least 12 characters.")
            return

        patient = db.query(Patient).filter(
            Patient.id == patient_id
        ).first()

        if patient is None:
            print("Patient not found.")
            return

        if db.query(PatientAccount).filter(
            PatientAccount.patient_id == patient_id
        ).first():
            print("This patient already has a login account.")
            return

        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()

        if existing_user:
            print("Username or email already exists.")
            return

        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role="patient",
            is_active=1,
        )

        db.add(user)
        db.flush()

        account = PatientAccount(
            user_id=user.id,
            patient_id=patient.id,
        )

        db.add(account)
        db.commit()

        print("Patient account created and linked successfully.")

    except ValueError:
        db.rollback()
        print("Patient ID must be a number.")
    except Exception as exc:
        db.rollback()
        print(f"Failed to create patient account: {exc}")
    finally:
        db.close()


if __name__ == "__main__":
    create_patient_account()
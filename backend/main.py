from datetime import date
from typing import Optional
from auth import require_roles
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, require_roles
from models import Patient, User, Doctor, PatientAccount, DoctorPatient
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from auth import create_access_token, verify_password
from models import User
from schemas import LoginRequest, TokenResponse
app = FastAPI(title="Patient Portal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# Pydantic schemas
# =========================

class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_code: str
    full_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    status: str


class PatientCreate(BaseModel):
    patient_code: str = Field(min_length=1, max_length=20)
    full_name: str = Field(min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=100)
    address: Optional[str] = Field(default=None, max_length=255)
    status: str = "Waiting"


class PatientUpdate(BaseModel):
    # Không cho phép cập nhật patient_code qua API này.
    full_name: str = Field(min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=100)
    address: Optional[str] = Field(default=None, max_length=255)
    status: str = "Waiting"


# =========================
# Common validation
# =========================

ALLOWED_GENDERS = {"Male", "Female", "Other"}
ALLOWED_STATUSES = {"Waiting", "Under Treatment", "Discharged"}


def validate_patient_data(gender, status):
    if gender is not None and gender not in ALLOWED_GENDERS:
        raise HTTPException(
            status_code=422,
            detail="Invalid gender",
        )

    if status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=422,
            detail="Invalid patient status",
        )


# =========================
# Health check
# =========================

@app.get("/")
def root():
    return {"message": "Patient Portal API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def database_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed",
        ) from exc


# =========================
# Get patients
# =========================


@app.get("/api/patients", response_model=list[PatientResponse])
def get_patients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Admin được xem tất cả bệnh nhân.
        if current_user.role == "admin":
            return (
                db.query(Patient)
                .order_by(Patient.id.desc())
                .all()
            )

        # Bác sĩ chỉ xem bệnh nhân được phân công.
        if current_user.role == "doctor":
            doctor = (
                db.query(Doctor)
                .filter(Doctor.user_id == current_user.id)
                .first()
            )

            if doctor is None:
                return []

            return (
                db.query(Patient)
                .join(
                    DoctorPatient,
                    DoctorPatient.patient_id == Patient.id,
                )
                .filter(DoctorPatient.doctor_id == doctor.id)
                .order_by(Patient.id.desc())
                .all()
            )

        # Bệnh nhân chỉ xem hồ sơ được liên kết với tài khoản của mình.
        if current_user.role == "patient":
            patient_account = (
                db.query(PatientAccount)
                .filter(PatientAccount.user_id == current_user.id)
                .first()
            )

            if patient_account is None:
                return []

            return (
                db.query(Patient)
                .filter(Patient.id == patient_account.patient_id)
                .all()
            )

        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view patients",
        )

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve patients",
        ) from exc


# =========================
# Create patient
# =========================

@app.post(
    "/api/patients",
    response_model=PatientResponse,
    status_code=201,
)
def create_patient(
    patient_data: PatientCreate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    validate_patient_data(
        patient_data.gender,
        patient_data.status,
    )

    patient = Patient(**patient_data.model_dump())
    db.add(patient)

    try:
        db.commit()
        db.refresh(patient)
        return patient

    except SQLAlchemyError as exc:
        db.rollback()

        if "Duplicate entry" in str(exc.orig):
            raise HTTPException(
                status_code=409,
                detail="Patient code already exists",
            ) from exc

        raise HTTPException(
            status_code=500,
            detail="Failed to create patient",
        ) from exc


# =========================
# Update patient
# =========================

@app.put(
    "/api/patients/{patient_id}",
    response_model=PatientResponse,
)
def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Tìm bệnh nhân theo ID
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    # Phân quyền: Admin được cập nhật mọi bệnh nhân
    # Doctor chỉ được cập nhật bệnh nhân được phân công
    if current_user.role == "doctor":
        doctor = (
            db.query(Doctor)
            .filter(Doctor.user_id == current_user.id)
            .first()
        )

        if doctor is None:
            raise HTTPException(
                status_code=403,
                detail="Doctor profile not found",
            )

        assignment = (
            db.query(DoctorPatient)
            .filter(
                DoctorPatient.doctor_id == doctor.id,
                DoctorPatient.patient_id == patient_id,
            )
            .first()
        )

        if assignment is None:
            raise HTTPException(
                status_code=403,
                detail="You can only update patients assigned to you",
            )

    elif current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update patients",
        )

    # Kiểm tra dữ liệu đầu vào
    validate_patient_data(
        patient_data.gender,
        patient_data.status,
    )

    # Chỉ cập nhật các trường được gửi lên
    update_data = patient_data.model_dump(exclude_unset=True)

    try:
        for field, value in update_data.items():
            setattr(patient, field, value)

        db.commit()
        db.refresh(patient)

        return patient

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to update patient",
        ) from exc
@app.delete("/api/patients/{patient_id}")
def delete_patient(
    patient_id: int,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    try:
        db.delete(patient)
        db.commit()

        return {
            "message": "Patient deleted successfully",
            "id": patient_id,
        }

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to delete patient",
        ) from exc
# =========================
# Authentication
# =========================

@app.post("/api/auth/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.username == login_data.username)
        .first()
    )

    # Dùng cùng một thông báo để tránh tiết lộ username có tồn tại hay không.
    if user is None or not verify_password(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is disabled",
        )

    token = create_access_token(
        subject=str(user.id),
        role=user.role,
    )

    return TokenResponse(access_token=token)
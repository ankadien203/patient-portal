from datetime import date, time, datetime
from typing import Optional
from auth import require_roles
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, time
from database import get_db
from auth import get_current_user, require_roles
from models import (
    Patient,
    User,
    Doctor,
    PatientAccount,
    DoctorPatient,
    Appointment,
    MedicalRecord,
    MedicalDocument,
    Prescription,
    HealthMetric,
)
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
import os
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse
from auth import create_access_token, verify_password, hash_password
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
from pydantic import EmailStr, Field, field_validator
class DoctorCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    full_name: str = Field(min_length=1, max_length=100)
    specialization: Optional[str] = Field(default=None, max_length=100)
    license_number: Optional[str] = Field(default=None, max_length=50)
    phone: Optional[str] = Field(default=None, max_length=20)
    department: Optional[str] = Field(default=None, max_length=100)

    @field_validator("username", "full_name")
    @classmethod
    def validate_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value
class DoctorUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    specialization: Optional[str] = Field(default=None, max_length=100)
    license_number: Optional[str] = Field(default=None, max_length=50)
    phone: Optional[str] = Field(default=None, max_length=20)
    department: Optional[str] = Field(default=None, max_length=100)

    @field_validator("full_name")
    @classmethod
    def validate_full_name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name cannot be blank")
        return value

class MedicalRecordCreate(BaseModel):
    appointment_id: int
    chief_complaint: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    doctor_notes: Optional[str] = None

class PatientRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    phone: Optional[str] = Field(default=None, max_length=20)
    gender: Optional[str] = None
    address: Optional[str] = Field(default=None, max_length=255)

    @field_validator("username", "full_name")
    @classmethod
    def validate_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value
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
# =========================
# Patient registration
# =========================

@app.post("/api/auth/register", status_code=201)
def register_patient(
    register_data: PatientRegister,
    db: Session = Depends(get_db),
):
    username = register_data.username.strip()
    email = str(register_data.email).strip().lower()

    # 1. Kiểm tra username đã tồn tại
    existing_username = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=409,
            detail="Username already exists",
        )

    # 2. Kiểm tra email đã tồn tại
    existing_email = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=409,
            detail="Email already exists",
        )

    try:
        # 3. Tạo tài khoản bệnh nhân
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(register_data.password),
            role="patient",
            is_active=1,
        )

        db.add(user)
        db.flush()

        # 4. Tạo mã bệnh nhân duy nhất
        patient_code = f"PAT{user.id:06d}"

        patient = Patient(
            patient_code=patient_code,
            full_name=register_data.full_name.strip(),
            date_of_birth=register_data.date_of_birth,
            gender=register_data.gender,
            phone=register_data.phone,
            email=email,
            address=register_data.address,
            status="Waiting",
        )

        db.add(patient)
        db.flush()

        # 5. Liên kết tài khoản và hồ sơ bệnh nhân
        patient_account = PatientAccount(
            user_id=user.id,
            patient_id=patient.id,
        )

        db.add(patient_account)

        # 6. Lưu tất cả trong cùng một transaction
        db.commit()

        return {
            "message": "Registration successful",
            "username": user.username,
            "role": user.role,
            "patient_id": patient.id,
        }

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to register patient",
        ) from exc
@app.get("/api/doctors")
def get_doctors(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    try:
        doctors = (
            db.query(Doctor, User)
            .join(User, Doctor.user_id == User.id)
            .order_by(Doctor.id.desc())
            .all()
        )

        return [
            {
                "id": doctor.id,
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "is_active": bool(user.is_active),
                "full_name": doctor.full_name,
                "specialization": doctor.specialization,
                "license_number": doctor.license_number,
                "phone": doctor.phone,
                "department": doctor.department,
            }
            for doctor, user in doctors
        ]

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve doctors",
        ) from exc
@app.post("/api/doctors", status_code=201)
def create_doctor(
    doctor_data: DoctorCreate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    username = doctor_data.username.strip()
    email = str(doctor_data.email).strip().lower()
    license_number = (
        doctor_data.license_number.strip()
        if doctor_data.license_number
        else None
    )

    # Kiểm tra username
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(
            status_code=409,
            detail="Username already exists",
        )

    # Kiểm tra email
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=409,
            detail="Email already exists",
        )

    # Kiểm tra số giấy phép hành nghề nếu có
    if license_number and (
        db.query(Doctor)
        .filter(Doctor.license_number == license_number)
        .first()
    ):
        raise HTTPException(
            status_code=409,
            detail="License number already exists",
        )

    try:
        # Tạo tài khoản đăng nhập
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(doctor_data.password),
            role="doctor",
            is_active=1,
        )

        db.add(user)
        db.flush()

        # Tạo hồ sơ bác sĩ liên kết với tài khoản
        doctor = Doctor(
            user_id=user.id,
            full_name=doctor_data.full_name.strip(),
            specialization=doctor_data.specialization,
            license_number=license_number,
            phone=doctor_data.phone,
            department=doctor_data.department,
        )

        db.add(doctor)
        db.commit()

        db.refresh(user)
        db.refresh(doctor)

        return {
            "message": "Doctor created successfully",
            "doctor": {
                "id": doctor.id,
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": doctor.full_name,
                "specialization": doctor.specialization,
                "license_number": doctor.license_number,
                "phone": doctor.phone,
                "department": doctor.department,
            },
        }

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to create doctor",
        ) from exc

# =========================
# Update doctor
# =========================
@app.put("/api/doctors/{doctor_id}")
def update_doctor(
    doctor_id: int,
    doctor_data: DoctorUpdate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")

    user = db.query(User).filter(User.id == doctor.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Doctor account not found")

    email = str(doctor_data.email).strip().lower()
    existing_email = (
        db.query(User)
        .filter(User.email == email, User.id != user.id)
        .first()
    )
    if existing_email:
        raise HTTPException(status_code=409, detail="Email already exists")

    license_number = (
        doctor_data.license_number.strip()
        if doctor_data.license_number and doctor_data.license_number.strip()
        else None
    )
    if license_number:
        existing_license = (
            db.query(Doctor)
            .filter(
                Doctor.license_number == license_number,
                Doctor.id != doctor.id,
            )
            .first()
        )
        if existing_license:
            raise HTTPException(
                status_code=409,
                detail="License number already exists",
            )

    try:
        doctor.full_name = doctor_data.full_name.strip()
        doctor.specialization = doctor_data.specialization
        doctor.license_number = license_number
        doctor.phone = doctor_data.phone
        doctor.department = doctor_data.department
        user.email = email

        db.commit()
        db.refresh(doctor)
        db.refresh(user)

        return {
            "message": "Doctor updated successfully",
            "doctor": {
                "id": doctor.id,
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "is_active": bool(user.is_active),
                "full_name": doctor.full_name,
                "specialization": doctor.specialization,
                "license_number": doctor.license_number,
                "phone": doctor.phone,
                "department": doctor.department,
            },
        }
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to update doctor",
        ) from exc
# =========================
# Appointment schemas
# =========================

from pydantic import field_validator


class AppointmentCreate(BaseModel):
    appointment_date: date
    appointment_time: time
    reason: Optional[str] = Field(default=None, max_length=2000)


class AppointmentStatusUpdate(BaseModel):
    status: str


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    doctor_id: int
    doctor_name: str
    appointment_date: date
    appointment_time: time
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
# =========================
# Get appointments
# =========================

@app.get("/api/appointments", response_model=list[AppointmentResponse])
def get_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Appointment, Patient, Doctor)
        .join(Patient, Appointment.patient_id == Patient.id)
        .join(Doctor, Appointment.doctor_id == Doctor.id)
    )

    if current_user.role == "admin":
        pass

    elif current_user.role == "doctor":
        doctor = (
            db.query(Doctor)
            .filter(Doctor.user_id == current_user.id)
            .first()
        )

        if doctor is None:
            return []

        query = query.filter(Appointment.doctor_id == doctor.id)

    elif current_user.role == "patient":
        patient_account = (
            db.query(PatientAccount)
            .filter(PatientAccount.user_id == current_user.id)
            .first()
        )

        if patient_account is None:
            return []

        query = query.filter(
            Appointment.patient_id == patient_account.patient_id
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view appointments",
        )

    rows = query.order_by(
        Appointment.appointment_date.desc(),
        Appointment.appointment_time.desc(),
    ).all()

    result = []

    for appointment, patient, doctor in rows:
        result.append({
            "id": appointment.id,
            "patient_id": patient.id,
            "patient_name": patient.full_name,
            "doctor_id": doctor.id,
            "doctor_name": doctor.full_name,
            "appointment_date": appointment.appointment_date,
            "appointment_time": appointment.appointment_time,
            "reason": appointment.reason,
            "notes": appointment.notes,
            "status": appointment.status,
            "created_at": appointment.created_at,
        })

    return result


# =========================
# Create appointment
# Automatically assign a doctor
# =========================

@app.post(
    "/api/appointments",
    response_model=AppointmentResponse,
    status_code=201,
)
def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    # 1. Tìm hồ sơ bệnh nhân
    patient_account = (
        db.query(PatientAccount)
        .filter(PatientAccount.user_id == current_user.id)
        .first()
    )

    if patient_account is None:
        raise HTTPException(
            status_code=404,
            detail="Patient profile not found",
        )

    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_account.patient_id)
        .first()
    )

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient profile not found",
        )

    # 2. Kiểm tra ngày giờ khám
    now = datetime.now()

    if appointment_data.appointment_date < now.date():
        raise HTTPException(
            status_code=422,
            detail="Appointment date cannot be in the past",
        )

    if (
        appointment_data.appointment_date == now.date()
        and appointment_data.appointment_time
        <= now.time().replace(tzinfo=None)
    ):
        raise HTTPException(
            status_code=422,
            detail="Appointment time must be in the future",
        )

    # 3. Lấy danh sách bác sĩ có tài khoản đang hoạt động
    doctors = (
        db.query(Doctor)
        .join(User, Doctor.user_id == User.id)
        .filter(User.is_active.is_(True))
        .order_by(Doctor.id.asc())
        .all()
    )

    if not doctors:
        raise HTTPException(
            status_code=409,
            detail="No active doctors are currently available",
        )

    # 4. Loại bỏ bác sĩ đã có lịch trùng thời gian
    available_doctors = []

    for doctor in doctors:
        conflicting_appointment = (
            db.query(Appointment.id)
            .filter(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date
                == appointment_data.appointment_date,
                Appointment.appointment_time
                == appointment_data.appointment_time,
                Appointment.status.in_(["Pending", "Confirmed"]),
            )
            .first()
        )

        if conflicting_appointment is None:
            available_doctors.append(doctor)

    if not available_doctors:
        raise HTTPException(
            status_code=409,
            detail=(
                "No doctors are available at the selected date and time. "
                "Please choose another time."
            ),
        )

    # 5. Trong các bác sĩ phù hợp, ưu tiên người có ít lịch đang hoạt động nhất.
    # Nếu số lượng bằng nhau, chọn bác sĩ có ID nhỏ hơn.
    doctor_loads = []

    for doctor in available_doctors:
        active_appointment_count = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == doctor.id,
                Appointment.status.in_(["Pending", "Confirmed"]),
            )
            .count()
        )

        doctor_loads.append(
            (active_appointment_count, doctor.id, doctor)
        )

    doctor_loads.sort(key=lambda item: (item[0], item[1]))
    doctor = doctor_loads[0][2]

    # 6. Tạo lịch hẹn
    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appointment_date=appointment_data.appointment_date,
        appointment_time=appointment_data.appointment_time,
        reason=appointment_data.reason,
        status="Pending",
    )

    try:
        db.add(appointment)
        db.commit()
        db.refresh(appointment)

        return {
            "id": appointment.id,
            "patient_id": patient.id,
            "patient_name": patient.full_name,
            "doctor_id": doctor.id,
            "doctor_name": doctor.full_name,
            "appointment_date": appointment.appointment_date,
            "appointment_time": appointment.appointment_time,
            "reason": appointment.reason,
            "notes": appointment.notes,
            "status": appointment.status,
            "created_at": appointment.created_at,
        }

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to create appointment",
        ) from exc
# =========================
# Update appointment status
# =========================

@app.patch("/api/appointments/{appointment_id}/status")
def update_appointment_status(
    appointment_id: int,
    status_data: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed_statuses = {
        "Pending",
        "Confirmed",
        "Completed",
        "Cancelled",
        "Rejected",
    }

    if status_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=422,
            detail="Invalid appointment status",
        )

    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id)
        .first()
    )

    if appointment is None:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found",
        )

    if current_user.role == "admin":
        allowed_transitions = {
            "Pending": {"Confirmed", "Rejected", "Cancelled"},
            "Confirmed": {"Cancelled", "Completed"},
            "Completed": set(),
            "Cancelled": set(),
            "Rejected": set(),
        }

    elif current_user.role == "doctor":
        doctor = (
            db.query(Doctor)
            .filter(Doctor.user_id == current_user.id)
            .first()
        )

        if doctor is None or appointment.doctor_id != doctor.id:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own appointments",
            )

        allowed_transitions = {
            "Pending": {"Confirmed", "Rejected"},
            "Confirmed": {"Completed"},
            "Completed": set(),
            "Cancelled": set(),
            "Rejected": set(),
        }

    elif current_user.role == "patient":
        patient_account = (
            db.query(PatientAccount)
            .filter(PatientAccount.user_id == current_user.id)
            .first()
        )

        if (
            patient_account is None
            or appointment.patient_id != patient_account.patient_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You can only update your own appointments",
            )

        allowed_transitions = {
            "Pending": {"Cancelled"},
            "Confirmed": {"Cancelled"},
            "Completed": set(),
            "Cancelled": set(),
            "Rejected": set(),
        }

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update appointments",
        )

    permitted = allowed_transitions.get(appointment.status, set())

    if status_data.status not in permitted:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot change appointment status "
                f"from {appointment.status} to {status_data.status}"
            ),
        )

    appointment.status = status_data.status

    try:
        db.commit()

        return {
            "message": "Appointment status updated successfully",
            "appointment_id": appointment.id,
            "status": appointment.status,
        }

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to update appointment status",
        ) from exc
from pydantic import BaseModel
from datetime import datetime
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
@app.get("/api/medical-records")
def get_medical_records(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Lấy danh sách hồ sơ bệnh án
    query = db.query(MedicalRecord)

    # Admin được xem tất cả hồ sơ
    if current_user.role == "admin":
        pass

    # Bệnh nhân chỉ được xem hồ sơ của mình
    elif current_user.role == "patient":
        patient_account = (
            db.query(PatientAccount)
            .filter(PatientAccount.user_id == current_user.id)
            .first()
        )

        if not patient_account:
            return []

        query = query.filter(
            MedicalRecord.patient_id == patient_account.patient_id
        )

    # Bác sĩ được xem hồ sơ do mình lập
    # hoặc hồ sơ của bệnh nhân được phân công
    elif current_user.role == "doctor":
        doctor = (
            db.query(Doctor)
            .filter(Doctor.user_id == current_user.id)
            .first()
        )

        if not doctor:
            return []

        assigned_patient_ids = (
            db.query(DoctorPatient.patient_id)
            .filter(DoctorPatient.doctor_id == doctor.id)
            .subquery()
        )

        query = query.filter(
            or_(
                MedicalRecord.doctor_id == doctor.id,
                MedicalRecord.patient_id.in_(assigned_patient_ids),
            )
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view medical records",
        )

    records = query.order_by(
        MedicalRecord.created_at.desc()
    ).all()

    return [
        {
            "id": record.id,
            "patient_id": record.patient_id,
            "doctor_id": record.doctor_id,
            "appointment_id": record.appointment_id,
            "chief_complaint": record.chief_complaint,
            "diagnosis": record.diagnosis,
            "treatment_plan": record.treatment_plan,
            "doctor_notes": record.doctor_notes,
            "created_at": record.created_at,
        }
        for record in records
    ]

@app.get("/api/medical-records/{record_id}")
def get_medical_record_detail(
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    record = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.id == record_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found",
        )

    # Admin được xem tất cả hồ sơ
    if current_user.role == "admin":
        pass

    # Bệnh nhân chỉ xem hồ sơ của mình
    elif current_user.role == "patient":
        patient_account = (
            db.query(PatientAccount)
            .filter(PatientAccount.user_id == current_user.id)
            .first()
        )

        if (
            not patient_account
            or patient_account.patient_id != record.patient_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You cannot access this medical record",
            )

    # Bác sĩ chỉ xem hồ sơ của bệnh nhân được phân công
    elif current_user.role == "doctor":
        doctor = (
            db.query(Doctor)
            .filter(Doctor.user_id == current_user.id)
            .first()
        )

        if not doctor:
            raise HTTPException(
                status_code=403,
                detail="Doctor account not found",
            )

        assignment = (
            db.query(DoctorPatient)
            .filter(
                DoctorPatient.doctor_id == doctor.id,
                DoctorPatient.patient_id == record.patient_id,
            )
            .first()
        )

        if not assignment:
            raise HTTPException(
                status_code=403,
                detail="You cannot access this medical record",
            )

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission",
        )

    return {
        "id": record.id,
        "patient_id": record.patient_id,
        "doctor_id": record.doctor_id,
        "appointment_id": record.appointment_id,
        "chief_complaint": record.chief_complaint,
        "diagnosis": record.diagnosis,
        "treatment_plan": record.treatment_plan,
        "doctor_notes": record.doctor_notes,
        "created_at": record.created_at,
    }
@app.get("/api/medical-records/{record_id}/documents")
def get_medical_documents(
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    record = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.id == record_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found",
        )

    # Kiểm tra quyền truy cập hồ sơ
    if current_user.role == "patient":
        account = (
            db.query(PatientAccount)
            .filter(PatientAccount.user_id == current_user.id)
            .first()
        )

        if not account or account.patient_id != record.patient_id:
            raise HTTPException(status_code=403, detail="Access denied")

    elif current_user.role == "doctor":
        doctor = (
            db.query(Doctor)
            .filter(Doctor.user_id == current_user.id)
            .first()
        )

        if not doctor:
            raise HTTPException(status_code=403, detail="Access denied")

        assignment = (
            db.query(DoctorPatient)
            .filter(
                DoctorPatient.doctor_id == doctor.id,
                DoctorPatient.patient_id == record.patient_id,
            )
            .first()
        )

        if not assignment:
            raise HTTPException(status_code=403, detail="Access denied")

    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    documents = (
        db.query(MedicalDocument)
        .filter(MedicalDocument.medical_record_id == record_id)
        .order_by(MedicalDocument.created_at.desc())
        .all()
    )

    return [
        {
            "id": document.id,
            "medical_record_id": document.medical_record_id,
            "document_type": document.document_type,
            "file_name": document.file_name,
            "mime_type": document.mime_type,
            "file_size": document.file_size,
            "created_at": document.created_at,
        }
        for document in documents
    ]
@app.get("/api/medical-documents/{document_id}/download")
def download_medical_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Tìm tài liệu
    document = (
        db.query(MedicalDocument)
        .filter(MedicalDocument.id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    # Lấy hồ sơ khám bệnh chứa tài liệu
    record = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.id == document.medical_record_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found",
        )

    # Kiểm tra quyền truy cập
    if current_user.role == "patient":
        account = (
            db.query(PatientAccount)
            .filter(PatientAccount.user_id == current_user.id)
            .first()
        )

        if not account or account.patient_id != record.patient_id:
            raise HTTPException(status_code=403, detail="Access denied")

    elif current_user.role == "doctor":
        doctor = (
            db.query(Doctor)
            .filter(Doctor.user_id == current_user.id)
            .first()
        )

        if not doctor:
            raise HTTPException(status_code=403, detail="Access denied")

        assignment = (
            db.query(DoctorPatient)
            .filter(
                DoctorPatient.doctor_id == doctor.id,
                DoctorPatient.patient_id == record.patient_id,
            )
            .first()
        )

        if not assignment:
            raise HTTPException(status_code=403, detail="Access denied")

    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    # Xác định đường dẫn lưu file
    storage_root = Path(__file__).resolve().parent / "medical_files"
    file_path = (storage_root / document.storage_key).resolve()

    # Ngăn truy cập file bên ngoài thư mục lưu trữ
    if not file_path.is_relative_to(storage_root.resolve()):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="PDF file not found")

    # Chỉ cho phép tải PDF
    if document.mime_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=Path(document.file_name).name,
        content_disposition_type="attachment",
    )
@app.get("/api/prescriptions")
def get_prescriptions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Prescription).join(
        MedicalRecord,
        Prescription.medical_record_id == MedicalRecord.id,
    )

    # Admin xem tất cả đơn thuốc
    if current_user.role == "admin":
        pass

    # Bệnh nhân chỉ xem đơn thuốc của mình
    elif current_user.role == "patient":
        account = (
            db.query(PatientAccount)
            .filter(PatientAccount.user_id == current_user.id)
            .first()
        )

        if not account:
            return []

        query = query.filter(
            MedicalRecord.patient_id == account.patient_id
        )

    # Bác sĩ chỉ xem đơn thuốc của bệnh nhân được phân công
    elif current_user.role == "doctor":
        doctor = (
            db.query(Doctor)
            .filter(Doctor.user_id == current_user.id)
            .first()
        )

        if not doctor:
            return []

        assigned_patient_ids = (
            db.query(DoctorPatient.patient_id)
            .filter(DoctorPatient.doctor_id == doctor.id)
            .subquery()
        )

        query = query.filter(
            MedicalRecord.patient_id.in_(assigned_patient_ids)
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view prescriptions",
        )

    prescriptions = query.order_by(
        Prescription.created_at.desc()
    ).all()

    return [
        {
            "id": item.id,
            "medical_record_id": item.medical_record_id,
            "medication_name": item.medication_name,
            "dosage": item.dosage,
            "frequency": item.frequency,
            "duration": item.duration,
            "instructions": item.instructions,
            "created_at": item.created_at,
        }
        for item in prescriptions
    ]
@app.get("/api/health-metrics")
def get_health_metrics(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(HealthMetric)

    # Admin xem tất cả chỉ số
    if current_user.role == "admin":
        pass

    # Bệnh nhân chỉ xem chỉ số của mình
    elif current_user.role == "patient":
        account = (
            db.query(PatientAccount)
            .filter(PatientAccount.user_id == current_user.id)
            .first()
        )

        if not account:
            return []

        query = query.filter(
            HealthMetric.patient_id == account.patient_id
        )

    # Bác sĩ chỉ xem chỉ số của bệnh nhân được phân công
    elif current_user.role == "doctor":
        doctor = (
            db.query(Doctor)
            .filter(Doctor.user_id == current_user.id)
            .first()
        )

        if not doctor:
            return []

        assigned_patient_ids = (
            db.query(DoctorPatient.patient_id)
            .filter(DoctorPatient.doctor_id == doctor.id)
            .subquery()
        )

        query = query.filter(
            HealthMetric.patient_id.in_(assigned_patient_ids)
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view health metrics",
        )

    metrics = query.order_by(
        HealthMetric.measured_at.desc()
    ).all()

    return [
        {
            "id": item.id,
            "patient_id": item.patient_id,
            "medical_record_id": item.medical_record_id,
            "metric_type": item.metric_type,
            "value": float(item.value),
            "unit": item.unit,
            "secondary_value": (
                float(item.secondary_value)
                if item.secondary_value is not None
                else None
            ),
            "measured_at": item.measured_at,
            "source": item.source,
        }
        for item in metrics
    ]
@app.post("/api/medical-records")
def create_medical_record(
    data: MedicalRecordCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Chỉ bác sĩ mới được tạo hồ sơ khám bệnh
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=403,
            detail="Only doctors can create medical records",
        )

    # Tìm thông tin bác sĩ đang đăng nhập
    doctor = (
        db.query(Doctor)
        .filter(Doctor.user_id == current_user.id)
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor profile not found",
        )

    # Tìm lịch hẹn cần lập hồ sơ
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == data.appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found",
        )

    # Chỉ bác sĩ được phân công mới được lập hồ sơ
    if appointment.doctor_id != doctor.id:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this appointment",
        )

    # Chỉ lập hồ sơ cho lịch hẹn đã hoàn thành
    if appointment.status != "Completed":
        raise HTTPException(
            status_code=400,
            detail="Appointment must be completed first",
        )

    # Mỗi lịch hẹn chỉ có một hồ sơ
    existing_record = (
        db.query(MedicalRecord)
        .filter(
            MedicalRecord.appointment_id == appointment.id
        )
        .first()
    )

    if existing_record:
        raise HTTPException(
            status_code=409,
            detail="Medical record already exists for this appointment",
        )

    # Tạo hồ sơ, lấy patient_id và doctor_id từ lịch hẹn
    record = MedicalRecord(
        appointment_id=appointment.id,
        patient_id=appointment.patient_id,
        doctor_id=doctor.id,
        chief_complaint=data.chief_complaint,
        diagnosis=data.diagnosis,
        treatment_plan=data.treatment_plan,
        doctor_notes=data.doctor_notes,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Medical record created successfully",
        "id": record.id,
        "appointment_id": record.appointment_id,
        "patient_id": record.patient_id,
        "doctor_id": record.doctor_id,
        "chief_complaint": record.chief_complaint,
        "diagnosis": record.diagnosis,
        "treatment_plan": record.treatment_plan,
        "doctor_notes": record.doctor_notes,
        "created_at": record.created_at,
    }
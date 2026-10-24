from datetime import date
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database import get_db
from models import Patient

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
def get_patients(db: Session = Depends(get_db)):
    try:
        return db.query(Patient).order_by(Patient.id.desc()).all()
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

    # Kiểm tra dữ liệu đầu vào
    validate_patient_data(
        patient_data.gender,
        patient_data.status,
    )

    # Cập nhật các trường được phép
    update_data = patient_data.model_dump()

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
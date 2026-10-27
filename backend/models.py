from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
    Time,
    Numeric,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_code = Column(String(20), nullable=False, unique=True, index=True)
    full_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(
        Enum("Male", "Female", "Other", name="patient_gender"),
        nullable=True,
    )
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)
    status = Column(
        Enum(
            "Waiting",
            "Under Treatment",
            "Discharged",
            name="patient_status",
        ),
        nullable=False,
        server_default=text("'Waiting'"),
    )
    created_at = Column(
        DateTime,
        nullable=True,
        server_default=func.current_timestamp(),
    )
    updated_at = Column(
        DateTime,
        nullable=True,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    username = Column(String(50), nullable=False, unique=True, index=True)
    email = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)

    role = Column(
        Enum("admin", "doctor", "patient", name="user_role"),
        nullable=False,
    )

    is_active = Column(
        Integer,
        nullable=False,
        server_default=text("1"),
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    full_name = Column(String(100), nullable=False)
    specialization = Column(String(100), nullable=True)
    license_number = Column(String(50), nullable=True, unique=True)
    phone = Column(String(20), nullable=True)
    department = Column(String(100), nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

class PatientAccount(Base):
    __tablename__ = "patient_accounts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

class DoctorPatient(Base):
    __tablename__ = "doctor_patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    doctor_id = Column(
        Integer,
        ForeignKey("doctors.id", ondelete="CASCADE"),
        nullable=False,
    )

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
    )

    assigned_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    __table_args__ = (
        UniqueConstraint(
            "doctor_id",
            "patient_id",
            name="uq_doctor_patient",
        ),
    )
class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    doctor_id = Column(
        Integer,
        ForeignKey("doctors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    appointment_date = Column(Date, nullable=False, index=True)
    appointment_time = Column(Time, nullable=False)

    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    status = Column(
        Enum(
            "Pending",
            "Confirmed",
            "Completed",
            "Cancelled",
            "Rejected",
            name="appointment_status",
        ),
        nullable=False,
        server_default=text("'Pending'"),
        index=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
# =========================
# Electronic Health Records (EHR)
# =========================

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, autoincrement=True)

    appointment_id = Column(
        Integer,
        ForeignKey("appointments.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
        index=True,
    )

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    doctor_id = Column(
        Integer,
        ForeignKey("doctors.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    chief_complaint = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    treatment_plan = Column(Text, nullable=True)
    doctor_notes = Column(Text, nullable=True)

    recorded_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)

    medical_record_id = Column(
        Integer,
        ForeignKey("medical_records.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    document_type = Column(
        Enum(
            "Examination",
            "LabResult",
            "Prescription",
            "Other",
            name="medical_document_type",
        ),
        nullable=False,
    )

    file_name = Column(String(255), nullable=False)

    # Khóa hoặc đường dẫn tương đối của file trong vùng lưu trữ riêng.
    # Không lưu file trong thư mục public của frontend.
    storage_key = Column(String(500), nullable=False, unique=True)

    mime_type = Column(
        String(100),
        nullable=False,
        server_default=text("'application/pdf'"),
    )

    file_size = Column(Integer, nullable=False)

    uploaded_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)

    medical_record_id = Column(
        Integer,
        ForeignKey("medical_records.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    medication_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=True)
    frequency = Column(String(100), nullable=True)
    duration = Column(String(100), nullable=True)
    instructions = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )


class HealthMetric(Base):
    __tablename__ = "health_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    medical_record_id = Column(
        Integer,
        ForeignKey("medical_records.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    metric_type = Column(
        Enum(
            "Height",
            "Weight",
            "BloodPressure",
            "HeartRate",
            "Temperature",
            "BloodGlucose",
            "SpO2",
            "Other",
            name="health_metric_type",
        ),
        nullable=False,
    )

    # Giá trị chính; ví dụ cân nặng = 65.5 kg.
    value = Column(Numeric(10, 2), nullable=False)

    # Ví dụ đơn vị kg, cm, bpm, °C, %.
    unit = Column(String(30), nullable=False)

    # Giá trị thứ hai, dùng cho huyết áp tâm trương.
    secondary_value = Column(Numeric(10, 2), nullable=True)

    measured_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    source = Column(
        String(100),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )
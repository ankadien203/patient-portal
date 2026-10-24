from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    Integer,
    String,
    text,
)
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
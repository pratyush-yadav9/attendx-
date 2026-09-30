import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    year_name = Column(String(50), unique=True, nullable=False)  # e.g., "2026-2027"
    is_current = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(20), unique=True, index=True, nullable=False)  # e.g. "CSE", "ECE"
    name = Column(String(150), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    students = relationship("Student", back_populates="department")
    teachers = relationship("Teacher", back_populates="department")
    semesters = relationship("Semester", back_populates="department")
    subjects = relationship("Subject", back_populates="department")


class Semester(Base):
    __tablename__ = "semesters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    semester_number = Column(Integer, nullable=False, index=True)  # 1 to 8
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=False)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("department_id", "semester_number", "academic_year_id", name="uq_department_semester_year"),
    )

    department = relationship("Department", back_populates="semesters")
    academic_year = relationship("AcademicYear")
    sections = relationship("Section", back_populates="semester")
    students = relationship("Student", back_populates="semester")


class Section(Base):
    __tablename__ = "sections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(20), nullable=False)  # "A", "B", "C"
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("department_id", "semester_id", "name", name="uq_department_semester_section"),
    )

    department = relationship("Department")
    semester = relationship("Semester", back_populates="sections")
    students = relationship("Student", back_populates="section")


class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_number = Column(String(50), unique=True, index=True, nullable=False)  # "LH-101"
    building = Column(String(100), nullable=False, default="Main Academic Block")
    capacity = Column(Integer, nullable=False, default=60)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, index=True, nullable=False)  # "CS301"
    name = Column(String(150), nullable=False)  # "Data Structures & Algorithms"
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=False)
    semester_number = Column(Integer, nullable=False)  # 1 to 8
    credits = Column(Integer, default=4, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    department = relationship("Department", back_populates="subjects")
    assignments = relationship("TeacherSubjectAssignment", back_populates="subject")


class TeacherSubjectAssignment(Base):
    __tablename__ = "teacher_subject_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("teachers.id"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=False)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("teacher_id", "subject_id", "section_id", "semester_id", name="uq_teacher_subject_section"),
    )

    teacher = relationship("Teacher", back_populates="assignments")
    subject = relationship("Subject", back_populates="assignments")
    section = relationship("Section")
    semester = relationship("Semester")


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    day_of_week = Column(String(20), nullable=False)  # "Monday", "Tuesday", etc.
    start_time = Column(String(10), nullable=False)  # "09:00"
    end_time = Column(String(10), nullable=False)  # "10:00"
    slot_period = Column(String(20), default="Morning", nullable=False)  # "Morning", "Afternoon", "Evening"
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(String(36), ForeignKey("teachers.id"), nullable=False)
    classroom_id = Column(String(36), ForeignKey("classrooms.id"), nullable=False)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    subject = relationship("Subject")
    teacher = relationship("Teacher")
    classroom = relationship("Classroom")
    section = relationship("Section")
    semester = relationship("Semester")

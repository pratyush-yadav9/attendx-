import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class Department(Base):
    __tablename__ = "departments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)

class Semester(Base):
    __tablename__ = "semesters"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    number = Column(Integer, nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)

class Section(Base):
    __tablename__ = "sections"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(10), nullable=False)
    semester_id = Column(UUID(as_uuid=True), ForeignKey("semesters.id"), nullable=False)

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)

class Classroom(Base):
    __tablename__ = "classrooms"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_number = Column(String(50), unique=True, nullable=False)
    building = Column(String(100), nullable=False)

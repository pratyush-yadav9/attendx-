from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class AcademicYearCreate(BaseModel):
    year_name: str
    is_current: bool = True


class AcademicYearResponse(BaseModel):
    id: str
    year_name: str
    is_current: bool
    model_config = ConfigDict(from_attributes=True)


class DepartmentCreate(BaseModel):
    code: str
    name: str


class DepartmentResponse(BaseModel):
    id: str
    code: str
    name: str
    model_config = ConfigDict(from_attributes=True)


class SemesterCreate(BaseModel):
    semester_number: int
    department_id: str
    academic_year_id: str
    is_active: bool = True


class SemesterResponse(BaseModel):
    id: str
    semester_number: int
    department_id: str
    academic_year_id: str
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class SectionCreate(BaseModel):
    name: str
    department_id: str
    semester_id: str


class SectionResponse(BaseModel):
    id: str
    name: str
    department_id: str
    semester_id: str
    model_config = ConfigDict(from_attributes=True)


class ClassroomCreate(BaseModel):
    room_number: str
    building: str = "Main Academic Block"
    capacity: int = 60


class ClassroomResponse(BaseModel):
    id: str
    room_number: str
    building: str
    capacity: int
    model_config = ConfigDict(from_attributes=True)


class SubjectCreate(BaseModel):
    code: str
    name: str
    department_id: str
    semester_number: int
    credits: int = 4


class SubjectResponse(BaseModel):
    id: str
    code: str
    name: str
    department_id: str
    semester_number: int
    credits: int
    model_config = ConfigDict(from_attributes=True)


class TeacherAssignmentCreate(BaseModel):
    teacher_id: str
    subject_id: str
    section_id: str
    semester_id: str


class TeacherAssignmentResponse(BaseModel):
    id: str
    teacher_id: str
    teacher_name: Optional[str] = None
    subject_id: str
    subject_name: Optional[str] = None
    section_id: str
    section_name: Optional[str] = None
    semester_id: str
    semester_number: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class TimetableSlotCreate(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    slot_period: str = "Morning"
    subject_id: str
    teacher_id: str
    classroom_id: str
    section_id: str
    semester_id: str


class TimetableSlotResponse(BaseModel):
    id: str
    day_of_week: str
    start_time: str
    end_time: str
    slot_period: str
    subject_id: str
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_id: str
    teacher_name: Optional[str] = None
    classroom_id: str
    room_number: Optional[str] = None
    section_id: str
    section_name: Optional[str] = None
    semester_id: str
    semester_number: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

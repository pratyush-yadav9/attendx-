from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    is_active: bool = True


class UserResponse(UserBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StudentCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    registration_number: str
    roll_number: str
    department_id: str
    semester_id: str
    section_id: str
    academic_year_id: str


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    roll_number: Optional[str] = None
    department_id: Optional[str] = None
    semester_id: Optional[str] = None
    section_id: Optional[str] = None
    is_active: Optional[bool] = None


class StudentResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    registration_number: str
    roll_number: str
    department_id: str
    department_name: Optional[str] = None
    semester_id: str
    semester_number: Optional[int] = None
    section_id: str
    section_name: Optional[str] = None
    academic_year_id: str
    photo_url: Optional[str] = None
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class TeacherCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    employee_id: str
    department_id: str
    designation: str = "Assistant Professor"
    phone: Optional[str] = None


class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class TeacherResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    employee_id: str
    department_id: str
    department_name: Optional[str] = None
    designation: str
    phone: Optional[str] = None
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class AdminResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    employee_id: str
    department_id: Optional[str] = None
    is_super_admin: bool
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

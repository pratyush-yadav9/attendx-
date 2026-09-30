from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User, Admin, Student, Teacher, RoleEnum
from app.schemas.auth import (
    LoginRequest,
    HodInitialSetupRequest,
    HodOtpVerifyRequest,
    TokenResponse,
    ForgotPasswordRequest,
)
from app.dependencies import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.get("/initial-setup-status")
def get_initial_setup_status(db: Session = Depends(get_db)):
    """
    Checks if initial HOD/Admin setup is open or locked.
    Once the first admin is created, setup is permanently locked.
    """
    admin_count = db.query(Admin).count()
    return {
        "success": True,
        "is_locked": admin_count > 0,
        "message": "Initial setup is locked." if admin_count > 0 else "Initial setup is available."
    }


@router.post("/initial-hod-setup", status_code=status.HTTP_201_CREATED)
def initial_hod_setup(data: HodInitialSetupRequest, request: Request, db: Session = Depends(get_db)):
    """
    One-time bootstrap endpoint for creating the first HOD / Administrator.
    Locked immediately once an administrator exists.
    """
    admin_count = db.query(Admin).count()
    if admin_count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Initial administrator setup is locked. Contact your existing system administrator."
        )

    # Check email duplicate
    existing_user = db.query(User).filter(User.email == data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Create user
    user = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=RoleEnum.HOD_ADMIN.value,
        is_active=True,
        is_verified=True,
        otp_secret="123456"  # Default test OTP for HOD 2FA
    )
    db.add(user)
    db.flush()

    admin = Admin(
        user_id=user.id,
        employee_id=data.employee_id,
        is_super_admin=True
    )
    db.add(admin)
    db.commit()

    AuditService.log(
        db=db,
        action="HOD_INITIAL_SETUP",
        target_type="ADMIN",
        user=user,
        target_id=admin.id,
        details={"email": user.email, "employee_id": data.employee_id},
        ip_address=request.client.host if request.client else None
    )

    return {
        "success": True,
        "message": "First HOD / Administrator account successfully initialized. Setup is now permanently locked."
    }


@router.post("/login")
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Secure unified login for Student, Teacher, and HOD.
    Role is derived strictly from the database.
    """
    identifier = data.username.strip()

    # Search by email, registration number, or employee ID
    user = db.query(User).filter(User.email == identifier.lower()).first()
    
    if not user:
        # Check student registration number
        student = db.query(Student).filter(Student.registration_number == identifier).first()
        if student:
            user = student.user
            
    if not user:
        # Check teacher or admin employee ID
        teacher = db.query(Teacher).filter(Teacher.employee_id == identifier).first()
        if teacher:
            user = teacher.user
        else:
            admin = db.query(Admin).filter(Admin.employee_id == identifier).first()
            if admin:
                user = admin.user

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username and password."
        )

    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username and password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the administrator."
        )

    # For HOD, require 2FA OTP verification if enabled
    if user.role == RoleEnum.HOD_ADMIN.value and user.otp_secret:
        return {
            "success": True,
            "message": "OTP verification required for HOD login.",
            "data": {
                "require_otp": True,
                "temp_user_id": user.id,
                "role": user.role
            }
        }

    # Generate token
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})

    # Prepare user summary
    user_info = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }

    if user.role == RoleEnum.STUDENT.value and user.student_profile:
        user_info["student_id"] = user.student_profile.id
        user_info["registration_number"] = user.student_profile.registration_number
        user_info["roll_number"] = user.student_profile.roll_number
        user_info["department_id"] = user.student_profile.department_id
        user_info["department_name"] = user.student_profile.department.name if user.student_profile.department else ""
        user_info["semester_id"] = user.student_profile.semester_id
        user_info["semester_number"] = user.student_profile.semester.semester_number if user.student_profile.semester else 1
        user_info["section_id"] = user.student_profile.section_id
        user_info["section_name"] = user.student_profile.section.name if user.student_profile.section else ""

    elif user.role == RoleEnum.TEACHER.value and user.teacher_profile:
        user_info["teacher_id"] = user.teacher_profile.id
        user_info["employee_id"] = user.teacher_profile.employee_id
        user_info["department_id"] = user.teacher_profile.department_id
        user_info["designation"] = user.teacher_profile.designation

    elif user.role == RoleEnum.HOD_ADMIN.value and user.admin_profile:
        user_info["admin_id"] = user.admin_profile.id
        user_info["employee_id"] = user.admin_profile.employee_id
        user_info["is_super_admin"] = user.admin_profile.is_super_admin

    return {
        "success": True,
        "message": "Login successful.",
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "role": user.role,
            "user": user_info
        }
    }


@router.post("/verify-otp")
def verify_hod_otp(data: HodOtpVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies HOD 2FA OTP code.
    """
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user or user.role != RoleEnum.HOD_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication session."
        )

    # In development, standard test OTP is '123456' or matches otp_secret
    if data.otp_code != user.otp_secret and data.otp_code != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please enter the correct verification code."
        )

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    admin = user.admin_profile

    return {
        "success": True,
        "message": "OTP verified successfully.",
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "role": user.role,
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "admin_id": admin.id if admin else None,
                "employee_id": admin.employee_id if admin else None
            }
        }
    }


@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns current authenticated profile with specific role details.
    """
    profile: dict = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active
    }

    if current_user.role == RoleEnum.STUDENT.value and current_user.student_profile:
        stu = current_user.student_profile
        profile.update({
            "student_id": stu.id,
            "registration_number": stu.registration_number,
            "roll_number": stu.roll_number,
            "department_id": stu.department_id,
            "department_name": stu.department.name if stu.department else "",
            "department_code": stu.department.code if stu.department else "",
            "semester_id": stu.semester_id,
            "semester_number": stu.semester.semester_number if stu.semester else 1,
            "section_id": stu.section_id,
            "section_name": stu.section.name if stu.section else "",
            "academic_year": stu.academic_year.year_name if stu.academic_year else ""
        })
    elif current_user.role == RoleEnum.TEACHER.value and current_user.teacher_profile:
        tch = current_user.teacher_profile
        profile.update({
            "teacher_id": tch.id,
            "employee_id": tch.employee_id,
            "department_id": tch.department_id,
            "department_name": tch.department.name if tch.department else "",
            "designation": tch.designation,
            "phone": tch.phone
        })
    elif current_user.role == RoleEnum.HOD_ADMIN.value and current_user.admin_profile:
        adm = current_user.admin_profile
        profile.update({
            "admin_id": adm.id,
            "employee_id": adm.employee_id,
            "department_id": adm.department_id,
            "is_super_admin": adm.is_super_admin
        })

    return {
        "success": True,
        "data": profile
    }

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any


class LoginRequest(BaseModel):
    username: str = Field(..., description="Email or Registration Number or Employee ID")
    password: str = Field(..., min_length=4)


class HodInitialSetupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    employee_id: str = Field(..., min_length=2)


class HodOtpVerifyRequest(BaseModel):
    user_id: str
    otp_code: str


class TokenResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"
    role: Optional[str] = None
    require_otp: bool = False
    temp_user_id: Optional[str] = None
    user: Optional[Dict[str, Any]] = None


class ForgotPasswordRequest(BaseModel):
    identifier: str  # email or registration number


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str = Field(..., min_length=6)

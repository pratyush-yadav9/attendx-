import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "AttendX — Intelligent Attendance & Anti-Proxy System"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite:///./attendx.db"
    
    JWT_SECRET_KEY: str = "attendx_super_secret_jwt_key_change_in_production_32bytes!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    QR_SECRET_KEY: str = "attendx_dynamic_qr_signing_key_secret_2026!"
    QR_EXPIRY_SECONDS: int = 7200
    
    DEFAULT_ATTENDANCE_THRESHOLD: float = 75.0
    
    COLLEGE_LATITUDE: float = 28.6139
    COLLEGE_LONGITUDE: float = 77.2090
    COLLEGE_RADIUS_METERS: float = 150.0
    
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL") or (
        "https://attendx-ten-lemon.vercel.app" if os.environ.get("VERCEL") else "http://localhost:5173"
    )
    REDIS_URL: str = "redis://localhost:6379/0"
    
    ALLOWED_ORIGINS: List[str] = [
        "https://attendx-ten-lemon.vercel.app",
        "https://attendx-attendx1.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow"
    )


settings = Settings()

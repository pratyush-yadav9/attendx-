from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://attendx_user:attendx_secure_password@localhost:5432/attendx_db")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# Model imports for metadata registration
from app.models.user import User
from app.models.academic import Department, Semester, Section, Subject, Classroom
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.models.audit import AttendanceOverrideLog

from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from math import radians, cos, sin, asin, sqrt
import uuid, os
from sqlalchemy import create_engine, Column, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
import datetime

# --- DATABASE SETUP (SQLite) ---
DATABASE_URL = "sqlite:///./attendx.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserDB(Base):
    __tablename__ = "users"
    email = Column(String, primary_key=True, index=True)
    password = Column(String)
    role = Column(String)

class SessionDB(Base):
    __tablename__ = "sessions"
    token = Column(String, primary_key=True, index=True)
    teacher_email = Column(String)
    subject_id = Column(String)
    classroom_id = Column(String)
    lat = Column(Float)
    lon = Column(Float)

class AttendanceDB(Base):
    __tablename__ = "attendance"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_token = Column(String, index=True)
    student_email = Column(String)
    distance_meters = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(bind=engine)

# --- APP SETUP ---
app = FastAPI(title="AttendX")
os.makedirs("static", exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- HAVERSINE FORMULA ---
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    return 2 * R * asin(sqrt(a))

# --- SCHEMAS ---
class UserAuth(BaseModel):
    email: str
    password: str

class StartSession(BaseModel):
    teacher_email: str
    subject_id: str
    classroom_id: str
    lat: float
    lon: float

class MarkAttendance(BaseModel):
    session_token: str
    student_email: str
    lat: float
    lon: float

# --- ENDPOINTS ---
@app.post("/api/v1/auth/register")
def register(user: UserAuth, role: str = "student", db: Session = Depends(get_db)):
    if db.query(UserDB).filter(UserDB.email == user.email).first():
        raise HTTPException(status_code=400, detail="User exists")
    new_user = UserDB(email=user.email, password=user.password, role=role)
    db.add(new_user)
    db.commit()
    return {"msg": f"{role.capitalize()} registered successfully!"}

@app.post("/api/v1/auth/login")
def login(user: UserAuth, db: Session = Depends(get_db)):
    db_user = db.query(UserDB).filter(UserDB.email == user.email, UserDB.password == user.password).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"msg": "Login successful", "role": db_user.role}

@app.post("/api/v1/attendance/session")
def start_session(data: StartSession, db: Session = Depends(get_db)):
    token = str(uuid.uuid4())[:6].upper()
    sess = SessionDB(
        token=token, teacher_email=data.teacher_email,
        subject_id=data.subject_id, classroom_id=data.classroom_id,
        lat=data.lat, lon=data.lon
    )
    db.add(sess)
    db.commit()
    return {"session_token": token}

@app.post("/api/v1/attendance/mark")
def mark_attendance(data: MarkAttendance, db: Session = Depends(get_db)):
    sess = db.query(SessionDB).filter(SessionDB.token == data.session_token).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Invalid session token")
    
    dist = haversine(sess.lat, sess.lon, data.lat, data.lon)
    if dist > 50:
        raise HTTPException(status_code=400, detail=f"Too far away ({int(dist)}m). Max radius: 50m")
    
    record = AttendanceDB(
        session_token=data.session_token,
        student_email=data.student_email,
        distance_meters=dist
    )
    db.add(record)
    db.commit()
    return {"msg": "Attendance marked successfully!", "distance_meters": int(dist)}

@app.get("/api/v1/attendance/records/{token}")
def get_attendance_records(token: str, db: Session = Depends(get_db)):
    records = db.query(AttendanceDB).filter(AttendanceDB.session_token == token).all()
    return [{"student_email": r.student_email, "distance_meters": r.distance_meters, "time": r.timestamp.strftime("%H:%M:%S")} for r in records]

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_frontend():
    return FileResponse("static/index.html")
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import init_db
from app.utils.scheduler import start_scheduler, stop_scheduler
from app.routers import (
    auth_router,
    students_router,
    teachers_router,
    attendance_router,
    admin_router,
    notifications_router,
    timetable_router,
    analytics_router,
    attendance_management_router,
)

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        from app.seed import seed_database
        seed_database()
    except Exception as e:
        print(f"[AttendX] Seed check: {e}")
    if not os.environ.get("VERCEL"):
        start_scheduler()
        print("[AttendX] Database initialized & background scheduler started.")
    else:
        print("[AttendX] Running in serverless Vercel environment; persistent scheduler omitted.")
    yield
    if not os.environ.get("VERCEL"):
        stop_scheduler()
    print("[AttendX] Application shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded photos securely
if os.environ.get("VERCEL"):
    import tempfile
    UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "uploads")
else:
    UPLOAD_DIR = os.path.join("uploads")

try:
    os.makedirs(os.path.join(UPLOAD_DIR, "attendance_photos"), exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
except Exception:
    pass

# Serve compiled frontend assets and SPA pages if available
from fastapi.responses import FileResponse, HTMLResponse

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if not os.path.exists(FRONTEND_DIST):
    FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

assets_dir = os.path.join(FRONTEND_DIST, "assets")
if os.path.exists(assets_dir):
    try:
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")
    except Exception:
        pass



# Standardized error response handling as per Section 50
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        }
    )


@app.exception_handler(RequestValidationError)
async def custom_validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_msg = errors[0].get("msg", "Validation error") if errors else "Validation failed"
    field = ".".join(str(x) for x in errors[0].get("loc", [])) if errors else ""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": f"Invalid input for {field}: {first_msg}" if field else first_msg,
            "details": errors
        }
    )



# Register all API routers
app.include_router(auth_router)
app.include_router(students_router)
app.include_router(teachers_router)
app.include_router(attendance_router)
app.include_router(admin_router)
app.include_router(notifications_router)
app.include_router(timetable_router)
app.include_router(analytics_router)
app.include_router(attendance_management_router, prefix="/api/v1/attendance-management", tags=["Attendance Management"])


@app.get("/api/health")
def health_check():
    return {
        "success": True,
        "status": "healthy",
        "timestamp": os.path.exists("attendx.db")
    }


@app.get("/")
@app.get("/login")
@app.get("/verify")
@app.get("/index.html")
def serve_spa_page():
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "success": True,
        "message": "AttendX — Intelligent Attendance & Anti-Proxy System API is running.",
        "documentation": "/docs",
        "environment": settings.ENVIRONMENT
    }


@app.get("/{full_path:path}")
def catch_all_spa_routes(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("uploads/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        raise StarletteHTTPException(status_code=404, detail="Not Found")
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    raise StarletteHTTPException(status_code=404, detail="Not Found")

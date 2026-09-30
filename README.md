# AttendX — Intelligent Attendance & Anti-Proxy System

AttendX is a full-stack, enterprise-grade attendance management application engineered for modern colleges and universities. It replaces static paper registers and insecure static QR sheets with a multi-layered anti-proxy verification suite featuring rotating cryptographic QR codes, client-side camera selfie verification, Haversine geolocation perimeter checks, and strict server-side Role-Based Access Control (RBAC).

---

## Architecture Overview

```
                      +---------------------------------------+
                      |         React + Vite Frontend         |
                      |  (TypeScript, Tailwind CSS, Lucide)   |
                      +-------------------+-------------------+
                                          |
                                HTTP / REST API (JWT + RBAC)
                                          |
                                          v
                      +---------------------------------------+
                      |         FastAPI Python Backend        |
                      |   (Security, HMAC QR, Geofence, RBAC) |
                      +-------------------+-------------------+
                                          |
                 +------------------------+------------------------+
                 |                                                 |
                 v                                                 v
    +-------------------------+                       +-------------------------+
    |   SQLAlchemy ORM DB     |                       |   Background Services   |
    | (PostgreSQL / SQLite)   |                       | (APScheduler / Cron)    |
    +-------------------------+                       +-------------------------+
```

### Core Technologies
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, HTML5 MediaDevices API, Canvas API, Canvas-Confetti.
- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic V2, PyJWT, Passlib (Bcrypt), APScheduler.
- **Database**: PostgreSQL (production) with automatic SQLite local development fallback.
- **Anti-Proxy Engine**:
  - HMAC-SHA256 time-bounded (45s) dynamic QR tokens with replay attack prevention.
  - Live browser camera capture (`navigator.mediaDevices.getUserMedia()`) with client-side canvas compression.
  - Real-time GPS distance calculation via the Haversine formula against configured campus geofences.
  - Immediate duplicate scan rejection per student session.
  - Server-side academic roster validation (section, semester, enrolled subject).

---

## User Roles & Capabilities

| Feature | Student | Teacher | HOD / Admin |
| :--- | :---: | :---: | :---: |
| Dynamic QR Scanner / Submission | Yes | No | No |
| Live Camera Selfie Verification | Yes | No | No |
| Subject-Wise & Overall % Breakdown | Yes | Read-Only | Read-Only |
| Submit Discrepancy Correction Request | Yes | No | No |
| Launch Live Class Session & Dynamic QR | No | Yes | No |
| Live Attendance Feed (Polling) | No | Yes | No |
| Class Roster Export (CSV) | No | Yes | Yes |
| Review Attendance Corrections | No | Yes | Yes |
| Department & Section Management | No | No | Yes |
| Student & Faculty Registration | No | No | Yes |
| Course Allocation & Timetable Setup | No | No | Yes |
| Semester Promotion & Record Lock | No | No | Yes |
| Campus GPS & Wi-Fi Configuration | No | No | Yes |
| Global Notification Broadcast | No | No | Yes |
| Immutable Audit Logs | No | No | Yes |

---

## Seed Accounts & Default Credentials

The database comes pre-seeded with active test accounts for all roles:

| Role | Username / Email | Password | 2FA / OTP Code |
| :--- | :--- | :--- | :--- |
| **HOD / Admin** | `hod@attendx.edu` or `hod.cse@college.edu` | `AdminPass@123` | `123456` |
| **Teacher** | `teacher@attendx.edu` or `rajesh.kumar@college.edu` | `TeacherPass@123` | *N/A* |
| **Student (Regular)** | `2024CSE001` or `aarav.sharma@student.college.edu` | `StudentPass@123` | *N/A* |
| **Student (At Risk)** | `2024CSE002` or `diya.patel@student.college.edu` | `StudentPass@123` | *N/A* |

---

## Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ (tested on Node v20.18.0)
- npm 9+

### 2. Backend Setup
```bash
# Navigate to project root
cd c:\Users\praty\attendx

# Activate existing virtualenv
.\venv\Scripts\Activate.ps1

# Run database migrations / seed
python backend/app/seed.py

# Launch FastAPI development server (runs on port 8000)
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# In a separate terminal, navigate to frontend
cd c:\Users\praty\attendx\frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server (runs on port 5173)
npm run dev
```

Visit the application at:
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Running the Automated Test Suite

AttendX includes a comprehensive 16-point backend test suite covering authentication, RBAC violations, dynamic QR rotation, anti-proxy fraud defenses, GPS geofencing, timetable clashes, semester promotions, and notification broadcasts.

```bash
# Run pytest from project root
.\venv\Scripts\python -m pytest backend/tests/test_api.py -v
```

All 16 tests pass deterministically:
```
backend/tests/test_api.py::test_root_health PASSED
backend/tests/test_api.py::test_initial_setup_locked PASSED
backend/tests/test_api.py::test_student_login_valid PASSED
backend/tests/test_api.py::test_student_login_invalid_password PASSED
backend/tests/test_api.py::test_hod_login_with_otp PASSED
backend/tests/test_api.py::test_rbac_student_cannot_access_hod_admin PASSED
backend/tests/test_api.py::test_rbac_student_cannot_access_teacher_apis PASSED
backend/tests/test_api.py::test_student_dashboard_and_stats PASSED
backend/tests/test_api.py::test_dynamic_qr_generation_and_verification_flow PASSED
backend/tests/test_api.py::test_anti_proxy_attendance_and_duplicate_prevention PASSED
backend/tests/test_api.py::test_geofence_rejection_outside_campus PASSED
backend/tests/test_api.py::test_notifications_endpoint PASSED
backend/tests/test_api.py::test_teacher_live_qr_and_report_flow PASSED
backend/tests/test_api.py::test_admin_timetable_clash_detection PASSED
backend/tests/test_api.py::test_admin_semester_promotion_and_preservation PASSED
backend/tests/test_api.py::test_admin_notification_broadcast PASSED
======================== 16 passed in 5.61s ========================
```

---

## Verification & Anti-Proxy Walkthrough

1. **Teacher Launches Session**:
   - Log in as `teacher@attendx.edu`.
   - On the Teacher Dashboard, select today's class (e.g. *CS301 Data Structures*) and click **Start Class**.
   - A live session is provisioned. The server issues a cryptographically signed HMAC token valid for 45 seconds.
   - The QR code auto-refreshes every 45 seconds with visual progress rings and projector full-screen mode.

2. **Student Scans & Verifies**:
   - Log in as `2024CSE001` (`StudentPass@123`).
   - Navigate to `/student/verify?token=<DYNAMIC_TOKEN>` (or click **Scan Dynamic QR** from the student dashboard).
   - The application checks student GPS against college premises.
   - The browser prompts for camera permission via `navigator.mediaDevices.getUserMedia()`.
   - The student captures a live selfie. The client crops and compresses it on a hidden HTML5 canvas.
   - The student submits verification. The backend validates:
     1. Signature authenticity & token expiration.
     2. Student enrollment in semester/section.
     3. Geofence radius compliance.
     4. Duplicate submission check (prevents double logging).
   - On success, celebration confetti triggers, and attendance percentages recalculate immediately.

3. **Teacher Live Monitor**:
   - In real-time, the Teacher Live Session page receives the incoming check-in with the student's timestamp, selfie thumbnail, and GPS coordinates.
   - When the teacher clicks **End Session**, the session status switches to `CLOSED`, immediately revoking any in-flight QR tokens.

4. **HOD / Admin Suite**:
   - Log in as `hod@attendx.edu` with 2FA OTP `123456`.
   - Adjust global attendance thresholds (e.g., 75% default).
   - Enforce semester promotion: all term attendance statistics are frozen into immutable audit snapshots, and students are migrated to the next semester.
   - Monitor real-time audit logs with client IP addresses, user agents, and action payloads.

---

## License
Proprietary & Confidential — AttendX College Attendance Systems.

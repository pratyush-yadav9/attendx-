@echo off
title AttendX Master Launcher
cd /d "%~dp0"
echo =================================================================
echo   AttendX — Intelligent Attendance ^& Anti-Proxy System
echo =================================================================
echo.
echo [1/3] Launching FastAPI Backend on http://localhost:8000 ...
start "AttendX Backend (Port 8000)" cmd /k "cd /d %~dp0 && call .\venv\Scripts\activate.bat && set PYTHONPATH=%~dp0backend;%PYTHONPATH% && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Waiting 3 seconds for backend initialization...
timeout /t 3 /nobreak >nul

echo [3/3] Launching React Vite Frontend on http://localhost:5173 ...
start "AttendX Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && set PATH=C:\Users\praty\nodejs;%PATH% && npm run dev"

echo.
echo =================================================================
echo   AttendX is now starting!
echo   Opening http://localhost:5173 in your default browser...
echo =================================================================
timeout /t 3 /nobreak >nul
start http://localhost:5173

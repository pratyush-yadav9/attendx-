@echo off
title AttendX Master Launcher
cd /d "%~dp0"
echo =================================================================
echo   AttendX — Intelligent Attendance ^& Anti-Proxy System
echo =================================================================
echo.

:: Auto-detect Node.js/npm on any Windows PC
where npm >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
    if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"
    if exist "C:\Users\%USERNAME%\nodejs" set "PATH=C:\Users\%USERNAME%\nodejs;%PATH%"
    if exist "%LOCALAPPDATA%\Programs\node" set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
)

echo [1/3] Launching FastAPI Backend on http://localhost:8000 ...
start "AttendX Backend (Port 8000)" cmd /k "cd /d %~dp0 && call .\venv\Scripts\activate.bat && set PYTHONPATH=%~dp0backend;%%PYTHONPATH%% && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Waiting 3 seconds for backend initialization...
timeout /t 3 /nobreak >nul

echo [3/3] Launching React Vite Frontend on http://localhost:5173 ...
start "AttendX Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =================================================================
echo   AttendX is now starting!
echo   Opening http://localhost:5173 in your default browser...
echo =================================================================
timeout /t 3 /nobreak >nul
start http://localhost:5173


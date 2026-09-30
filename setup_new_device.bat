@echo off
title AttendX Setup on New Device
cd /d "%~dp0"
echo =================================================================
echo   AttendX — Automated Setup for New Device
echo =================================================================
echo.

:: 1. Copy .env if not exists
if not exist ".env" (
    echo [1/5] Creating .env file from .env.example ...
    copy .env.example .env >nul
    echo       .env file created successfully.
) else (
    echo [1/5] .env file already exists.
)

:: 2. Check Python
echo.
echo [2/5] Checking Python installation ...
python --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10 or 3.11 from https://www.python.org/downloads/
    echo (Make sure to check "Add Python to PATH" during installation)
    pause
    exit /b 1
)
python --version

:: 3. Setup Virtual Environment and Backend Dependencies
echo.
echo [3/5] Setting up Python virtual environment (venv) ...
if not exist "venv\Scripts\activate.bat" (
    python -m venv venv
    echo       Virtual environment created.
) else (
    echo       Virtual environment already exists.
)

echo       Installing backend Python dependencies ...
call .\venv\Scripts\activate.bat
pip install -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend requirements.
    pause
    exit /b 1
)

:: 4. Seed Database with 20 Students, Admin, and Teachers
echo.
echo [4/5] Initializing database and seeding CS students & teachers ...
set PYTHONPATH=%~dp0backend;%PYTHONPATH%
python backend\app\seed.py

:: 5. Setup Frontend Dependencies
echo.
echo [5/5] Setting up Frontend React dependencies ...

:: Check Node.js/npm path
where npm >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
    if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"
    if exist "C:\Users\%USERNAME%\nodejs" set "PATH=C:\Users\%USERNAME%\nodejs;%PATH%"
    if exist "%LOCALAPPDATA%\Programs\node" set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm is not installed or not in PATH!
    echo Please install Node.js (LTS version) from https://nodejs.org/
    pause
    exit /b 1
)

cd frontend
call npm install
cd ..

echo.
echo =================================================================
echo   AttendX Setup Finished Successfully!
echo =================================================================
echo.
echo You can now start the entire application by running:
echo   start_attendx.bat
echo.
echo Default Logins:
echo   HOD / Admin : admin@attendx.edu      (Password: Admin@123)
echo   Teacher     : prof.sharma@attendx.edu (Password: Teacher@123)
echo   Student     : 2024CSE001 / Student@123
echo =================================================================
echo.
pause

@echo off
title AttendX Backend Server
cd /d "%~dp0"
echo ===================================================
echo Starting AttendX FastAPI Backend on port 8000...
echo Swagger UI will be available at: http://localhost:8000/docs
echo ===================================================
set PYTHONPATH=%~dp0backend;%PYTHONPATH%
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause

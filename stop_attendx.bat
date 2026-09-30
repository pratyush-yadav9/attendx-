@echo off
title Stop AttendX
echo =================================================================
echo   Stopping AttendX Servers (Freeing Ports 8000 and 5173)...
echo =================================================================

:: Kill any process on port 8000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo Terminating backend PID %%a on port 8000...
    taskkill /f /pid %%a 2>nul
)

:: Kill any process on port 5173 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Terminating frontend PID %%a on port 5173...
    taskkill /f /pid %%a 2>nul
)

echo.
echo =================================================================
echo   All AttendX processes stopped! Ports are clean and ready.
echo =================================================================
pause

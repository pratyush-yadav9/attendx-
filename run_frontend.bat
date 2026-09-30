@echo off
title AttendX Frontend Server
cd /d "%~dp0frontend"
set PATH=C:\Users\praty\nodejs;%PATH%
echo ===================================================
echo Starting AttendX Vite Frontend on port 5173...
echo App will be available at: http://localhost:5173
echo ===================================================
call npm run dev
pause

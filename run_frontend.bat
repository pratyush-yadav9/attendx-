@echo off
title AttendX Frontend Server
cd /d "%~dp0frontend"

:: Auto-detect Node.js/npm on any Windows PC
where npm >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
    if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"
    if exist "C:\Users\%USERNAME%\nodejs" set "PATH=C:\Users\%USERNAME%\nodejs;%PATH%"
    if exist "%LOCALAPPDATA%\Programs\node" set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
)

echo ===================================================
echo Starting AttendX Vite Frontend on port 5173...
echo App will be available at: http://localhost:5173
echo ===================================================
call npm run dev
pause


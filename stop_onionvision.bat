@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM ONIONVISION — Autonomous Shutdown Script
REM Gracefully terminates ONIONVISION FastAPI and Vite processes.
REM ============================================================

echo ============================================================
echo           Stopping ONIONVISION Services...
echo ============================================================

REM 1. Close named cmd windows if any
taskkill /FI "WINDOWTITLE eq ONIONVISION Backend (FastAPI)*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq ONIONVISION Frontend (Vite)*" /T /F >nul 2>&1

REM 2. Terminate process on Port 8000 (FastAPI Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Stopping process on port 8000 (PID: %%a)...
    taskkill /PID %%a /F >nul 2>&1
)

REM 3. Terminate process on Port 5173 (Vite Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo Stopping process on port 5173 (PID: %%a)...
    taskkill /PID %%a /F >nul 2>&1
)

REM 4. Terminate process on Port 5174 (Secondary Vite port if used)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174" ^| findstr "LISTENING"') do (
    echo Stopping process on port 5174 (PID: %%a)...
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo ============================================================
echo [SUCCESS] ONIONVISION services have been stopped.
echo ============================================================

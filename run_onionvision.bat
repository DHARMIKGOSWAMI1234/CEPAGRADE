@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM ONIONVISION — Autonomous Single-Click Windows Launcher
REM AI-Based Onion Quality Inspection & Automated Grading System
REM Team: THE DEBUGGERS
REM ============================================================

echo ============================================================
echo      ONIONVISION -- AI Onion Quality Inspection System
echo                   Smart India Hackathon
echo ============================================================
echo.

REM 1. Determine Repository Root
set "REPO_ROOT=%~dp0"
cd /d "%REPO_ROOT%"
echo [1/8] Repository Root: %REPO_ROOT%

REM 2. Verify Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python was not found in PATH. Please install Python 3.10+ and add to PATH.
    pause
    exit /b 1
)
echo [2/8] Python is installed.

REM 3. Verify Node & NPM
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js was not found in PATH. Please install Node.js 18+ and add to PATH.
    pause
    exit /b 1
)
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm was not found in PATH.
    pause
    exit /b 1
)
echo [3/8] Node.js and npm verified.

REM 4. Verify Virtual Environment
if not exist "%REPO_ROOT%backend\.venv\Scripts\python.exe" (
    echo [ERROR] Backend virtual environment not found at backend\.venv\Scripts\python.exe
    pause
    exit /b 1
)
echo [4/8] Backend virtual environment located.

REM 5. Verify Model Files
set "SEG_MODEL=%REPO_ROOT%ml\models\onion_segmentation_yolov8n.pt"
set "CLS_MODEL=%REPO_ROOT%ml\models\onion_health_mobilenetv3_small.pth"

if not exist "%SEG_MODEL%" (
    echo [ERROR] Segmentation model missing: %SEG_MODEL%
    pause
    exit /b 1
)
if not exist "%CLS_MODEL%" (
    echo [ERROR] Classification model missing: %CLS_MODEL%
    pause
    exit /b 1
)
echo [5/8] Required ML models verified (YOLOv8n-seg & MobileNetV3-Small).

REM 6. Start Backend (FastAPI on port 8000)
echo [6/8] Starting FastAPI backend on http://127.0.0.1:8000 ...
start "ONIONVISION Backend (FastAPI)" cmd /c ""%REPO_ROOT%backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir "%REPO_ROOT%backend" --host 127.0.0.1 --port 8000"

REM 7. Start Frontend (Vite on port 5173)
echo [7/8] Starting Vite frontend on http://localhost:5173 ...
start "ONIONVISION Frontend (Vite)" cmd /c "cd /d "%REPO_ROOT%frontend" && npm run dev"

REM 8. Wait for Services and Open Browser
echo [8/8] Waiting for services to initialize...
set /a ATTEMPTS=0

:WAIT_LOOP
timeout /t 2 /nobreak >nul
set /a ATTEMPTS+=1

REM Check backend health
"%REPO_ROOT%backend\.venv\Scripts\python.exe" -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=1)" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo [SUCCESS] All ONIONVISION services are ONLINE!
    echo Backend:  http://127.0.0.1:8000
    echo Frontend: http://localhost:5173
    echo ============================================================
    echo Opening browser...
    start http://localhost:5173
    echo To safely stop all services, run stop_onionvision.bat
    goto :EOF
)

if %ATTEMPTS% LSS 15 (
    goto :WAIT_LOOP
)

echo [WARNING] Services took longer than expected to report ready.
echo Attempting to open frontend anyway: http://localhost:5173
start http://localhost:5173

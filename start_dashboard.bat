@echo off
REM ======================================================================
REM   Somalia Dashboard v3.0 - Bulletproof Silent Launcher
REM   Geo-Insights Lab, ESCWA, United Nations
REM ======================================================================
REM   This script is called by the HTML launcher via URL protocol.
REM   It runs silently in the background and:
REM     1. Terminates previous sessions (port 8000 & 5000)
REM     2. Clears Python cache (__pycache__, .pyc)
REM     3. Validates and frees network ports (aggressive)
REM     4. Installs missing dependencies (Flask, etc.)
REM     5. Starts Dashboard Server (port 8000)
REM     6. Starts Update/API Server (port 5000)
REM ======================================================================

REM Change to script directory
cd /d "%~dp0"

REM Log file for troubleshooting
set LOGFILE=launcher.log
echo [%DATE% %TIME%] ====== LAUNCHER STARTED ====== >> %LOGFILE%

REM ======================================================================
REM   PHASE 1: TERMINATE ALL PYTHON PROCESSES (Nuclear Option)
REM ======================================================================
echo [%DATE% %TIME%] Phase 1: Terminating ALL Python processes... >> %LOGFILE%

REM ========== STEP 1: Kill ALL Python processes (clean slate) ==========
REM This ensures no orphaned processes survive from previous sessions
echo [%DATE% %TIME%] Step 1a: Killing all python.exe processes... >> %LOGFILE%
taskkill /F /IM python.exe >nul 2>&1
if not errorlevel 1 (
    echo [%DATE% %TIME%] Killed python.exe processes >> %LOGFILE%
)

echo [%DATE% %TIME%] Step 1b: Killing all pythonw.exe processes... >> %LOGFILE%
taskkill /F /IM pythonw.exe >nul 2>&1
if not errorlevel 1 (
    echo [%DATE% %TIME%] Killed pythonw.exe processes >> %LOGFILE%
)

REM Brief pause to allow processes to fully terminate
timeout /t 1 /nobreak >nul

REM ========== STEP 2: Verify port cleanup (belt and suspenders) ==========
REM In case any non-Python process is holding the ports
echo [%DATE% %TIME%] Step 2: Verifying ports are free... >> %LOGFILE%

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000.*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo [%DATE% %TIME%] Extra kill PID %%a on port 8000 >> %LOGFILE%
)

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5000.*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo [%DATE% %TIME%] Extra kill PID %%a on port 5000 >> %LOGFILE%
)

REM Final pause to ensure all processes are terminated
timeout /t 1 /nobreak >nul

echo [%DATE% %TIME%] Phase 1: Complete - All Python processes terminated >> %LOGFILE%

REM ======================================================================
REM   PHASE 2: CLEAR PYTHON CACHE (Aggressive)
REM ======================================================================
echo [%DATE% %TIME%] Phase 2: Clearing Python cache... >> %LOGFILE%

REM Remove __pycache__ directories recursively
for /d /r %%d in (__pycache__) do (
    if exist "%%d" (
        rmdir /S /Q "%%d" >nul 2>&1
        echo [%DATE% %TIME%] Removed %%d >> %LOGFILE%
    )
)

REM Remove .pyc files
del /S /Q *.pyc >nul 2>&1

REM Remove .pyo files
del /S /Q *.pyo >nul 2>&1

REM Clear old log files (keep current)
for %%f in (server.log update_server.log) do (
    if exist "%%f" del /Q "%%f" >nul 2>&1
)

echo [%DATE% %TIME%] Phase 2: Complete >> %LOGFILE%

REM ======================================================================
REM   PHASE 3: VALIDATE NETWORK PORTS (Final Verification)
REM ======================================================================
echo [%DATE% %TIME%] Phase 3: Validating ports are free... >> %LOGFILE%

REM Check if port 8000 is free
netstat -ano 2>nul | findstr ":8000.*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [%DATE% %TIME%] Port 8000: FREE >> %LOGFILE%
) else (
    echo [%DATE% %TIME%] Port 8000: Still in use - attempting cleanup >> %LOGFILE%
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000.*LISTENING"') do (
        taskkill /F /PID %%a >nul 2>&1
        echo [%DATE% %TIME%] Killed stubborn PID %%a on 8000 >> %LOGFILE%
    )
)

REM Check if port 5000 is free
netstat -ano 2>nul | findstr ":5000.*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [%DATE% %TIME%] Port 5000: FREE >> %LOGFILE%
) else (
    echo [%DATE% %TIME%] Port 5000: Still in use - attempting cleanup >> %LOGFILE%
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5000.*LISTENING"') do (
        taskkill /F /PID %%a >nul 2>&1
        echo [%DATE% %TIME%] Killed stubborn PID %%a on 5000 >> %LOGFILE%
    )
)

REM Brief pause before starting servers
timeout /t 1 /nobreak >nul

echo [%DATE% %TIME%] Phase 3: Complete >> %LOGFILE%

REM ======================================================================
REM   PHASE 4: CHECK & INSTALL DEPENDENCIES
REM ======================================================================
echo [%DATE% %TIME%] Phase 4: Checking dependencies... >> %LOGFILE%

REM Check if Flask is installed, install if missing
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [%DATE% %TIME%] Installing Flask... >> %LOGFILE%
    python -m pip install flask flask-cors --quiet >nul 2>&1
)

REM Check if requests is installed
python -c "import requests" >nul 2>&1
if errorlevel 1 (
    echo [%DATE% %TIME%] Installing requests... >> %LOGFILE%
    python -m pip install requests --quiet >nul 2>&1
)

echo [%DATE% %TIME%] Phase 4: Complete >> %LOGFILE%

REM ======================================================================
REM   PHASE 5: START DASHBOARD SERVER (Port 8000)
REM ======================================================================
echo [%DATE% %TIME%] Phase 5: Starting Dashboard Server on port 8000... >> %LOGFILE%

REM Start HTTP server in background (hidden window)
start /B /MIN "" python -m http.server 8000 >nul 2>&1

REM Wait for server to start
timeout /t 2 /nobreak >nul

REM Verify dashboard server is running
netstat -ano | findstr ":8000.*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [%DATE% %TIME%] WARNING: Dashboard server may not have started >> %LOGFILE%
) else (
    echo [%DATE% %TIME%] Dashboard server started successfully >> %LOGFILE%
)

echo [%DATE% %TIME%] Phase 5: Complete >> %LOGFILE%

REM ======================================================================
REM   PHASE 6: START UPDATE/API SERVER (Port 5000)
REM ======================================================================
echo [%DATE% %TIME%] Phase 6: Starting Update Server on port 5000... >> %LOGFILE%

REM Check if update_server.py exists
if not exist "update_server.py" (
    echo [%DATE% %TIME%] ERROR: update_server.py not found! >> %LOGFILE%
    goto :END
)

REM Start Update server in background (hidden window)
start /B /MIN "" python update_server.py >nul 2>&1

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Verify update server is running
netstat -ano | findstr ":5000.*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [%DATE% %TIME%] WARNING: Update server may not have started >> %LOGFILE%
) else (
    echo [%DATE% %TIME%] Update server started successfully >> %LOGFILE%
)

echo [%DATE% %TIME%] Phase 6: Complete >> %LOGFILE%

REM ======================================================================
REM   COMPLETE - Servers are running, HTML launcher handles browser
REM ======================================================================
:END
echo [%DATE% %TIME%] ====== LAUNCHER COMPLETE ====== >> %LOGFILE%
echo. >> %LOGFILE%

REM Exit silently
exit

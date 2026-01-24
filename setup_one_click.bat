@echo off
echo ======================================================================
echo   Somalia Dashboard - One-Click Setup
echo ======================================================================
echo.
echo This will enable one-click startup from the HTML launcher.
echo You only need to run this ONCE.
echo.
echo Press any key to continue or close this window to cancel...
pause >nul

REM Get the current directory (where this script is located)
set "DASHBOARD_PATH=%~dp0"
set "DASHBOARD_PATH=%DASHBOARD_PATH:~0,-1%"

echo.
echo [1/3] Creating custom URL protocol...

REM Create a temporary .reg file with the correct path
echo Windows Registry Editor Version 5.00 > "%TEMP%\somalia_dashboard.reg"
echo. >> "%TEMP%\somalia_dashboard.reg"
echo [HKEY_CURRENT_USER\Software\Classes\somalia-dashboard] >> "%TEMP%\somalia_dashboard.reg"
echo @="URL:Somalia Dashboard Protocol" >> "%TEMP%\somalia_dashboard.reg"
echo "URL Protocol"="" >> "%TEMP%\somalia_dashboard.reg"
echo. >> "%TEMP%\somalia_dashboard.reg"
echo [HKEY_CURRENT_USER\Software\Classes\somalia-dashboard\shell] >> "%TEMP%\somalia_dashboard.reg"
echo. >> "%TEMP%\somalia_dashboard.reg"
echo [HKEY_CURRENT_USER\Software\Classes\somalia-dashboard\shell\open] >> "%TEMP%\somalia_dashboard.reg"
echo. >> "%TEMP%\somalia_dashboard.reg"
echo [HKEY_CURRENT_USER\Software\Classes\somalia-dashboard\shell\open\command] >> "%TEMP%\somalia_dashboard.reg"
echo @="\"%SystemRoot%\\System32\\wscript.exe\" \"%DASHBOARD_PATH:\=\\%\\launch_silent.vbs\"" >> "%TEMP%\somalia_dashboard.reg"

echo [2/3] Installing URL protocol...
regedit /s "%TEMP%\somalia_dashboard.reg"
del "%TEMP%\somalia_dashboard.reg"

echo [3/3] Setup complete!
echo.
echo ======================================================================
echo   SUCCESS! One-click startup is now enabled.
echo ======================================================================
echo.
echo   You can now use the launcher HTML file!
echo   It will automatically start everything with one click!
echo.
echo   Dashboard folder: %DASHBOARD_PATH%
echo.
echo ======================================================================
echo.
pause

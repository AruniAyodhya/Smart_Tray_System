@echo off
echo ===================================================
echo     SMART TRAY SYSTEM - CONTINUOUS LEARNING RUN
echo ===================================================
echo Date: %date% Time: %time%

cd /d "%~dp0"
"C:/Users/Malith Kanishka/AppData/Local/Programs/Python/Python313/python.exe" pipeline_manager.py

echo.
echo Run completed.
pause

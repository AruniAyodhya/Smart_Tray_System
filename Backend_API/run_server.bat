@echo off
cd /d "%~dp0"
"C:/Users/Malith Kanishka/AppData/Local/Programs/Python/Python313/python.exe" -m uvicorn main:app --reload --host 0.0.0.0 --port 5000
pause
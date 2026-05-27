@echo off
chcp 65001 >nul
cd /d %~dp0
if not exist .venv (
    echo [1/4] Creating virtual environment...
    python -m venv .venv
)
call .venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
if not exist data mkdir data
echo [4/4] Starting Library Management System...
echo Browser URL: http://127.0.0.1:8000
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
pause

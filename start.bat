@echo off
setlocal

echo =========================================
echo      Starting Whisper UI Setup...
echo =========================================

:: Setup & Start Backend
echo.
echo [1/2] Checking backend dependencies...
cd backend
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
pip install -e ..

echo Starting FastAPI Backend...
start /B "Backend" cmd /c "uvicorn main:app --port 8000"
cd ..

:: Setup & Start Frontend
echo.
echo [2/2] Checking frontend dependencies...
cd frontend
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm install
)

echo Starting Next.js Frontend...
start /B "Frontend" cmd /c "npm run dev"
cd ..

:: Wait for servers to spin up
echo.
echo Waiting for servers to initialize...
timeout /t 5 /nobreak > nul

:: Open browser
echo Opening browser...
start http://localhost:3000

echo.
echo =========================================
echo ✅ Everything is running! 
echo Close this terminal window to stop all servers.
echo =========================================
pause

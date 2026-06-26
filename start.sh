#!/bin/bash

echo "🚀 Starting Whisper UI Setup..."

# Setup & Start Backend
echo "📦 Checking backend dependencies..."
cd backend || exit
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
pip install -e ..

echo "🟢 Starting FastAPI Backend..."
uvicorn main:app --port 8000 &
BACKEND_PID=$!
cd ..

# Setup & Start Frontend
echo "📦 Checking frontend dependencies..."
cd frontend || exit
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    # If bun is installed, use it for speed, otherwise fallback to npm
    if command -v bun &> /dev/null; then
        bun install
    else
        npm install
    fi
fi

echo "🟢 Starting Next.js Frontend..."
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for servers to spin up
echo "⏳ Waiting for servers to start..."
sleep 3

# Open browser
echo "🌐 Opening browser..."
if command -v open &> /dev/null; then
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
fi

echo "✅ Everything is running! Press Ctrl+C in this terminal to stop the servers."

# Trap Ctrl+C to cleanly kill the background processes
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    # Fallback: force kill any processes still listening on the frontend and backend ports
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    exit 0
}

trap cleanup INT TERM
wait

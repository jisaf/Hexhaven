#!/bin/bash
# Hexhaven Development Server Startup Script (Corrected)
# This script sets up and runs both backend and frontend development servers.
# It uses the in-memory data store and does not require a database connection.

set -e # Exit on error

echo "🎮 Hexhaven Development Server Setup (In-Memory Mode)"
echo "======================================================"

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# 1. Build the backend
echo ""
echo "📦 Building backend..."
cd backend
npm run build
cd ..
echo -e "${GREEN}✅ Backend built successfully.${NC}"


# 2. Start both servers
echo ""
echo -e "${GREEN}🚀 Starting development servers...${NC}"
echo ""
echo "Backend will run on: http://localhost:3000"
echo "Frontend will run on: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Function to kill all child processes on exit
cleanup() {
    echo ""
    echo "Stopping development servers..."
    kill 0
}

trap cleanup EXIT

# Start backend in background using the corrected script
cd backend
npm run start:prod &
BACKEND_PID=$!

# Give backend a moment to start
sleep 3

# Start frontend in background
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

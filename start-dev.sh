#!/bin/bash

# Hexhaven Development Server Startup Script
# This script sets up and runs both backend and frontend development servers

set -e  # Exit on error

echo "🎮 Hexhaven Development Server Setup"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Error: This script must be run from the Hexhaven root directory${NC}"
    exit 1
fi

# Check if .env exists in backend
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Warning: backend/.env not found${NC}"
    echo "Creating backend/.env with default PostgreSQL connection..."
    echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hexhaven?schema=public"' > backend/.env
    echo -e "${YELLOW}Please update backend/.env with your actual database credentials if needed${NC}"
fi

# Backend setup
echo ""
echo "📦 Setting up backend..."
cd backend

# Install backend dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
else
    echo "Backend dependencies already installed"
fi

# Generate Prisma Client
echo "Generating Prisma Client..."
npm run prisma:generate

# Run migrations (create if needed)
echo "Running database migrations..."
npm run prisma:migrate:deploy 2>/dev/null || npm run prisma:migrate

cd ..

# Frontend setup
echo ""
echo "📦 Setting up frontend..."
cd frontend

# Install frontend dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo "Frontend dependencies already installed"
fi

cd ..

# Start both servers
echo ""
echo -e "${GREEN}✅ Setup complete! Starting development servers...${NC}"
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

# Start backend in background
cd backend
# Start tsc in watch mode
npx tsc -w --preserveWatchOutput 2>&1 | sed 's/^/[TSC] /' &
TSC_PID=$!

# Wait for initial compilation
echo "Waiting for initial TypeScript compilation..."
sleep 5

# Start backend with nodemon watching the dist directory
npx nodemon --watch dist/backend/src --exec "node dist/backend/src/main.js" &
BACKEND_PID=$!

# Give backend a moment to start
sleep 3

# Start frontend in background
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

#!/bin/bash
# Hexhaven Development Server Startup Script
# This script sets up and runs both backend and frontend development servers.
# Requires PostgreSQL database connection.

set -e # Exit on error

echo "🎮 Hexhaven Development Server Setup"
echo "======================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check database connection
echo ""
echo "🔍 Checking database connection..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not running on localhost:5432${NC}"
    echo "Please start PostgreSQL and ensure the database 'hexhaven_dev' exists."
    exit 1
fi
echo -e "${GREEN}✅ Database connection OK${NC}"

# 2. Run database migrations
echo ""
echo "📊 Running database migrations..."
cd backend
npx prisma migrate deploy
echo -e "${GREEN}✅ Migrations applied${NC}"

# 3. Seed database (if needed)
echo ""
echo "🌱 Seeding database..."
npx prisma db seed || echo -e "${YELLOW}⚠️  Seed may have already run (this is OK)${NC}"
echo -e "${GREEN}✅ Database seeded${NC}"

# 4. Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate
echo -e "${GREEN}✅ Prisma client generated${NC}"

# 5. Build the backend
echo ""
echo "📦 Building backend..."
npm run build
cd ..
echo -e "${GREEN}✅ Backend built successfully.${NC}"

# 6. Start both servers
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

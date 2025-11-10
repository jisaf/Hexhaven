@echo off
REM Hexhaven Development Server Startup Script (Windows)
REM This script sets up and runs both backend and frontend development servers

echo.
echo 🎮 Hexhaven Development Server Setup
echo ====================================
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo Error: This script must be run from the Hexhaven root directory
    exit /b 1
)
if not exist "frontend" (
    echo Error: This script must be run from the Hexhaven root directory
    exit /b 1
)

REM Check if .env exists in backend
if not exist "backend\.env" (
    echo Warning: backend\.env not found
    echo Creating backend\.env with default PostgreSQL connection...
    echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hexhaven?schema=public"> backend\.env
    echo Please update backend\.env with your actual database credentials if needed
)

REM Backend setup
echo.
echo 📦 Setting up backend...
cd backend

REM Install backend dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
) else (
    echo Backend dependencies already installed
)

REM Generate Prisma Client
echo Generating Prisma Client...
call npm run prisma:generate

REM Run migrations
echo Running database migrations...
call npm run prisma:migrate:deploy 2>nul || call npm run prisma:migrate

cd ..

REM Frontend setup
echo.
echo 📦 Setting up frontend...
cd frontend

REM Install frontend dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
) else (
    echo Frontend dependencies already installed
)

cd ..

REM Start both servers
echo.
echo ✅ Setup complete! Starting development servers...
echo.
echo Backend will run on: http://localhost:3000
echo Frontend will run on: http://localhost:5173
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start both servers in new windows
start "Hexhaven Backend" cmd /k "cd backend && npm run dev"
start "Hexhaven Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Development servers started in separate windows!
echo Close those windows to stop the servers.
echo.
pause

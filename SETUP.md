# Hexhaven Development Setup

Quick guide to get the Hexhaven development environment running.

## Prerequisites

- **Node.js** (v18 or later)
- **PostgreSQL** database server running locally
- **npm** package manager

## Quick Start

### Linux/Mac

```bash
./start-dev.sh
```

### Windows

```cmd
start-dev.bat
```

That's it! The script will:
1. Install all dependencies for backend and frontend
2. Generate Prisma Client
3. Run database migrations
4. Start both development servers

## NPM Workspace Commands (New)

This project uses NPM workspaces, allowing you to run commands from the root directory:

```bash
# Install all dependencies (backend + frontend)
npm install

# Run both dev servers individually
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only

# Build both projects
npm run build          # Build backend and frontend
npm run build:backend  # Backend only
npm run build:frontend # Frontend only

# Run tests
npm run test           # Test both
npm run test:backend   # Backend tests only
npm run test:frontend  # Frontend tests only

# Run linters
npm run lint           # Lint both
npm run lint:backend   # Backend only
npm run lint:frontend  # Frontend only

# Database commands (from root)
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

**Note**: To run both dev servers simultaneously, use the `./start-dev.sh` script (Linux/Mac) or `start-dev.bat` (Windows) for better process management.

## Manual Setup

If you prefer to set up manually or need more control:

### 1. Database Configuration

Create a `.env` file in the `backend` directory:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/hexhaven?schema=public"
```

Replace `user`, `password`, and database details with your PostgreSQL credentials.

### 2. Backend Setup

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

Backend runs on **http://localhost:3000**

### 3. Frontend Setup

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

## Development URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000 (Socket.IO)

## Useful Commands

### Backend

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start:prod   # Run production build
npm test             # Run tests
npm run lint         # Run linter
npm run prisma:studio  # Open Prisma Studio (database GUI)
```

### Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
npm run lint         # Run linter
```

## Database Management

```bash
cd backend

# Generate Prisma Client after schema changes
npm run prisma:generate

# Create a new migration
npm run prisma:migrate

# Apply migrations
npm run prisma:migrate:deploy

# Open Prisma Studio (visual database editor)
npm run prisma:studio

# Seed the database
npm run db:seed
```

## Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Check your `backend/.env` file has correct DATABASE_URL
3. Verify database exists: `createdb hexhaven`

### Port Already in Use

If ports 3000 or 5173 are already in use:

- **Backend**: Set `PORT` in `backend/.env`
- **Frontend**: Vite will automatically try the next available port

### Dependencies Issues

Using NPM workspaces (recommended):

```bash
# Clean install for entire monorepo (from root)
npm run clean
npm install
```

Or manually for individual packages:

```bash
# Clean install for backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Clean install for frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

After the servers are running:

1. Open http://localhost:5173 in your browser
2. Create or join a game room
3. Start testing the multiplayer Gloomhaven experience!

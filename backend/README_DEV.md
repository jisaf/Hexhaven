# Backend Development Guide

## Quick Start

**From project root:**
```bash
npm run dev
```

**From backend directory:**
```bash
npm run dev
```

## Server Configuration

- **Backend API**: `http://localhost:3001`
- **Frontend**: `http://localhost:5173` (connects to backend on port 3001)

## Build Output Structure

The TypeScript build creates a nested structure due to the monorepo setup with shared types:

```
backend/dist/
├── backend/
│   └── src/
│       ├── main.js          ← Entry point
│       └── **/*.js          ← Compiled source
├── shared/
│   └── types/
│       └── **/*.js          ← Compiled shared types
└── data/                    ← Static game data
```

**Why nested?** The build includes both `backend/src/` AND `../shared/` imports, so TypeScript creates a common root that preserves both paths.

## Development Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Build + watch mode with nodemon (RECOMMENDED) |
| `npm run build` | Build TypeScript to `dist/backend/src/` |
| `npm run start:prod` | Run compiled output |
| `npm run dev:nest` | Use NestJS watch mode (may fail - see note below) |

## Important Notes

### Build Path Configuration

The compiled entry point is at:
```
dist/backend/src/main.js
```

NOT `dist/main.js` as NestJS CLI might expect. This is correct for our monorepo structure.

### Why dev script uses nodemon

The `npm run dev:nest` script (`nest start --watch`) expects output at `dist/main.js` but our monorepo structure outputs to `dist/backend/src/main.js`.

The `npm run dev` script works around this by:
1. Building once initially
2. Using nodemon to watch `src/**/*.ts` files
3. Rebuilding and restarting on changes

This ensures consistent, reliable development experience.

### Frontend-Backend Connection

Frontend is configured to connect to backend on port 3001:

**Frontend** (`frontend/.env` or vite config):
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

**Backend** (`backend/.env`):
```env
PORT=3001
```

## Troubleshooting

### "Cannot find module '/home/ubuntu/hexhaven/backend/dist/main'"

**Cause:** Using `nest start --watch` which expects different output path.

**Solution:** Use `npm run dev` instead (which uses nodemon).

### Port 3001 already in use

```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 npm run dev
```

### Prisma Client errors

```bash
npx prisma generate
```

## Build System Details

```
┌─────────────────────────────────┐
│  TypeScript Source              │
│  - backend/src/**/*.ts          │
│  - ../shared/types/**/*.ts      │
└────────────┬────────────────────┘
             │
             ▼
      ┌──────────────┐
      │  nest build  │
      │  (uses tsc)  │
      └──────┬───────┘
             │
             ▼
┌─────────────────────────────────┐
│  Compiled Output                │
│  backend/dist/backend/src/*.js  │
│  backend/dist/shared/types/*.js │
└────────────┬────────────────────┘
             │
             ▼
      ┌──────────────┐
      │  node        │
      │  main.js     │
      └──────┬───────┘
             │
             ▼
      ┌──────────────┐
      │  NestJS App  │
      │  Port: 3001  │
      └──────────────┘
```

## Configuration Files

### tsconfig.json
- `outDir: "./dist"` - Output to `backend/dist/`
- `include: ["src/**/*"]` - Only compile src/ during build (not tests)
- `exclude` - Explicitly exclude tests and node_modules

### package.json
- `start:prod` - Runs `node dist/backend/src/main`
- `dev` - Builds then watches with nodemon

### nest-cli.json
- `sourceRoot: "src"` - Source code location
- `entryFile: "main"` - Entry point filename (without .ts)

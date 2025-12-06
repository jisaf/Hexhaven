#!/bin/bash
# Pre-commit CI test suite runner
# Runs locally before commits to catch failures early

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking staged files..."

# Get staged files
STAGED_FILES=$(git diff --cached --name-only)

if [ -z "$STAGED_FILES" ]; then
  echo "${YELLOW}⚠ No staged files found${NC}"
  exit 0
fi

# Check if only docs/config changed
ONLY_DOCS=true
while IFS= read -r file; do
  # Skip if file is:
  # - .md file
  # - .claude/commands/*.md
  # - .json (except package.json)
  # - .gitignore or .env
  if [[ ! "$file" =~ \.md$ ]] && \
     [[ ! "$file" =~ \.claude/commands/.*\.md$ ]] && \
     [[ ! "$file" =~ \.json$ || "$file" == "package.json" || "$file" == "package-lock.json" ]] && \
     [[ ! "$file" =~ \.gitignore$ ]] && \
     [[ ! "$file" =~ \.env ]]; then
    ONLY_DOCS=false
    break
  fi
done <<< "$STAGED_FILES"

if [ "$ONLY_DOCS" = true ]; then
  echo "${GREEN}✓ Only documentation/config changes - skipping CI tests${NC}"
  exit 0
fi

# Determine which tests to run
RUN_BACKEND=false
RUN_FRONTEND=false

while IFS= read -r file; do
  if [[ "$file" =~ ^backend/ ]]; then
    RUN_BACKEND=true
  fi
  if [[ "$file" =~ ^frontend/ ]]; then
    RUN_FRONTEND=true
  fi
done <<< "$STAGED_FILES"

# Run backend tests
if [ "$RUN_BACKEND" = true ]; then
  echo ""
  echo "📦 Running backend CI tests..."

  cd backend

  echo "  → Linting..."
  npm run lint || { echo "${RED}✗ Backend lint failed${NC}"; exit 1; }

  echo "  → Type checking..."
  npx tsc --noEmit || { echo "${RED}✗ Backend type check failed${NC}"; exit 1; }

  echo "  → Running tests..."
  npm test || { echo "${RED}✗ Backend tests failed${NC}"; exit 1; }

  echo "  → Building..."
  npm run build || { echo "${RED}✗ Backend build failed${NC}"; exit 1; }

  cd ..
  echo "${GREEN}✓ Backend tests passed${NC}"
fi

# Run frontend tests
if [ "$RUN_FRONTEND" = true ]; then
  echo ""
  echo "🎨 Running frontend CI tests..."

  cd frontend

  echo "  → Linting..."
  npm run lint || { echo "${RED}✗ Frontend lint failed${NC}"; exit 1; }

  echo "  → Type checking..."
  npx tsc -b || { echo "${RED}✗ Frontend type check failed${NC}"; exit 1; }

  echo "  → Running tests..."
  npm test || { echo "${RED}✗ Frontend tests failed${NC}"; exit 1; }

  echo "  → Building..."
  npm run build || { echo "${RED}✗ Frontend build failed${NC}"; exit 1; }

  cd ..
  echo "${GREEN}✓ Frontend tests passed${NC}"
fi

echo ""
echo "${GREEN}✓ All CI tests passed - safe to commit${NC}"
exit 0

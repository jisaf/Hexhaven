#!/bin/bash
#
# Run E2E tests using Docker Compose
# Usage: ./scripts/e2e-docker-run.sh [--build] [--no-cache]
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse arguments
BUILD_IMAGE=false
NO_CACHE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --build)
      BUILD_IMAGE=true
      shift
      ;;
    --no-cache)
      NO_CACHE="--no-cache"
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--build] [--no-cache]"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}=== Running E2E Tests with Docker Compose ===${NC}"

# Build image if requested
if [ "$BUILD_IMAGE" = true ]; then
  echo -e "${BLUE}Building Docker image...${NC}"
  ./scripts/e2e-docker-build.sh $NO_CACHE
fi

# Clean up any existing containers
echo -e "${YELLOW}Cleaning up existing containers...${NC}"
docker-compose -f docker-compose.e2e.yml down -v 2>/dev/null || true

# Create results directories
mkdir -p frontend/test-results
mkdir -p frontend/playwright-report

# Run tests
echo -e "${BLUE}Starting services and running tests...${NC}"
docker-compose -f docker-compose.e2e.yml up \
  --abort-on-container-exit \
  --exit-code-from e2e-tests

EXIT_CODE=$?

# Clean up
echo -e "${YELLOW}Cleaning up containers...${NC}"
docker-compose -f docker-compose.e2e.yml down -v

# Report results
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ E2E tests passed!${NC}"
else
  echo -e "${RED}✗ E2E tests failed (exit code: $EXIT_CODE)${NC}"
fi

# Show where to find results
echo -e "${BLUE}Test results:${NC}"
echo -e "  - JUnit: frontend/test-results/junit.xml"
echo -e "  - HTML Report: frontend/playwright-report/index.html"

exit $EXIT_CODE

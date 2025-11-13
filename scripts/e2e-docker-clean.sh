#!/bin/bash
#
# Clean up Docker resources from E2E testing
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Cleaning E2E Docker Resources ===${NC}"

# Stop and remove containers
echo -e "${YELLOW}Stopping containers...${NC}"
docker-compose -f docker-compose.e2e.yml down -v 2>/dev/null || true

# Remove the e2e image
echo -e "${YELLOW}Removing e2e image...${NC}"
docker rmi hexhaven-e2e:latest 2>/dev/null || echo "Image not found, skipping..."

# Prune unused resources
echo -e "${YELLOW}Pruning unused Docker resources...${NC}"
docker system prune -f

echo -e "${GREEN}✓ Cleanup complete!${NC}"

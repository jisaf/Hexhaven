#!/bin/bash
#
# Build Docker image for E2E testing
# Supports multi-architecture builds (amd64, arm64)
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Building E2E Docker Image ===${NC}"

# Get platform architecture
PLATFORM=$(uname -m)
case $PLATFORM in
  x86_64)
    DOCKER_PLATFORM="linux/amd64"
    ;;
  aarch64|arm64)
    DOCKER_PLATFORM="linux/arm64"
    ;;
  *)
    echo -e "${RED}Unsupported platform: $PLATFORM${NC}"
    exit 1
    ;;
esac

echo -e "${BLUE}Building for platform: $DOCKER_PLATFORM${NC}"

# Build the image
docker buildx build \
  --platform "$DOCKER_PLATFORM" \
  --file Dockerfile.e2e \
  --tag hexhaven-e2e:latest \
  --load \
  .

echo -e "${GREEN}✓ Docker image built successfully!${NC}"
echo -e "${BLUE}Image: hexhaven-e2e:latest${NC}"

# Show image size
docker images hexhaven-e2e:latest --format "Size: {{.Size}}"

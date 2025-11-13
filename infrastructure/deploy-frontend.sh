#!/bin/bash
set -e

# Deploy frontend to Nginx web root
# This script builds the frontend and copies it to the Nginx serving directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/hexhaven/frontend}"

echo "=== Hexhaven Frontend Deployment ==="
echo "Project root: $PROJECT_ROOT"
echo "Deploy target: $DEPLOY_DIR"
echo ""

# Build frontend
echo "Building frontend..."
cd "$FRONTEND_DIR"
npm ci --production=false
npm run build

# Create deployment directory
echo "Creating deployment directory..."
sudo mkdir -p "$DEPLOY_DIR"

# Copy built files
echo "Deploying to $DEPLOY_DIR..."
sudo rm -rf "$DEPLOY_DIR/dist"
sudo cp -r "$FRONTEND_DIR/dist" "$DEPLOY_DIR/"

# Set proper permissions
echo "Setting permissions..."
sudo chown -R nginx:nginx "$DEPLOY_DIR"
sudo chmod -R 755 "$DEPLOY_DIR"

# Verify deployment
if [ -f "$DEPLOY_DIR/dist/index.html" ]; then
    echo "✓ Frontend deployed successfully!"
    echo "  Location: $DEPLOY_DIR/dist"
    echo "  Files: $(find "$DEPLOY_DIR/dist" -type f | wc -l) files"
else
    echo "✗ Deployment failed - index.html not found"
    exit 1
fi

echo ""
echo "Next steps:"
echo "  1. Ensure Nginx config is updated: sudo cp infrastructure/nginx/hexhaven.conf /etc/nginx/conf.d/"
echo "  2. Test Nginx config: sudo nginx -t"
echo "  3. Reload Nginx: sudo systemctl reload nginx"

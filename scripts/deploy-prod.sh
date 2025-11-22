#!/bin/bash
set -e

# Fresh SSH deployment to production server
# Usage: ./deploy-prod.sh [ssh-key-path]

HOST="${PRODUCTION_HOST:-129.213.88.197}"
USER="ubuntu"
SSH_KEY="${1:-}"

info() { echo "▶ $*"; }
error() { echo "✗ $*" >&2; exit 1; }

# Setup SSH command
if [ -n "$SSH_KEY" ]; then
  SSH="ssh -i $SSH_KEY"
  SCP="scp -i $SSH_KEY"
else
  SSH="ssh"
  SCP="scp"
fi

# Test connection
info "Testing SSH to $HOST"
$SSH -o ConnectTimeout=5 $USER@$HOST "echo ok" >/dev/null || error "SSH failed"

# Build locally
info "Installing dependencies"
npm ci

info "Running tests"
npm test || true

info "Building backend"
npm run build -w backend

info "Building frontend"
VITE_API_URL="http://$HOST" npm run build -w frontend

# Create deployment package
info "Creating deployment package"
tar czf deploy.tar.gz \
  package.json \
  package-lock.json \
  backend/package.json \
  backend/dist \
  backend/prisma \
  frontend/dist \
  ecosystem.config.js \
  scripts/deploy.sh \
  scripts/server-config.sh

# Upload
info "Uploading to $HOST"
$SCP deploy.tar.gz $USER@$HOST:/tmp/

# Extract and deploy on server
info "Deploying on server"
$SSH $USER@$HOST 'bash -s' <<'DEPLOY'
set -e

# Install Node.js if needed
if ! command -v node >/dev/null; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Extract
cd /tmp
tar xzf deploy.tar.gz
rm deploy.tar.gz

# Copy to deployment directory
sudo mkdir -p /opt/hexhaven
sudo cp -r . /opt/hexhaven/
sudo chown -R ubuntu:ubuntu /opt/hexhaven

# Deploy
cd /opt/hexhaven

# Initialize server config
if [ -f scripts/server-config.sh ]; then
  chmod +x scripts/server-config.sh
  ./scripts/server-config.sh init || true
  ./scripts/server-config.sh generate || true
fi

# Run deployment script
if [ -f scripts/deploy.sh ]; then
  chmod +x scripts/deploy.sh
  ./scripts/deploy.sh || true
fi

# Install PM2 if needed
if ! command -v pm2 >/dev/null; then
  sudo npm install -g pm2
fi

# Restart backend
pm2 delete hexhaven-backend 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

# Setup Nginx if not installed
if ! command -v nginx >/dev/null; then
  sudo apt-get update
  sudo apt-get install -y nginx
  sudo systemctl enable nginx
  sudo systemctl start nginx
fi

# Copy frontend to nginx directory
sudo mkdir -p /var/www/hexhaven/frontend
sudo cp -r frontend/dist/* /var/www/hexhaven/frontend/
sudo chown -R www-data:www-data /var/www/hexhaven

echo "✓ Deployed successfully"
DEPLOY

# Cleanup
rm deploy.tar.gz

info "✓ Deployment complete"
info "URL: http://$HOST"

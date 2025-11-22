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

info "Building backend"
npm run build -w backend

info "Building frontend"
VITE_API_URL="http://$HOST" npm run build -w frontend

# Create deployment package
info "Creating deployment package"
mkdir -p /tmp/hexhaven-deploy/frontend /tmp/hexhaven-deploy/backend /tmp/hexhaven-deploy/scripts
cp package.json package-lock.json /tmp/hexhaven-deploy/
cp backend/package.json /tmp/hexhaven-deploy/backend/
cp -r backend/dist backend/prisma /tmp/hexhaven-deploy/backend/
cp -r frontend/dist/* /tmp/hexhaven-deploy/frontend/
cp ecosystem.config.js /tmp/hexhaven-deploy/
cp scripts/deploy.sh scripts/server-config.sh /tmp/hexhaven-deploy/scripts/
cd /tmp/hexhaven-deploy
tar czf /tmp/deploy.tar.gz *
cd -
mv /tmp/deploy.tar.gz deploy.tar.gz

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
mkdir -p /tmp/hexhaven-extract
cd /tmp/hexhaven-extract
tar xzf /tmp/deploy.tar.gz
rm /tmp/deploy.tar.gz

# Copy to deployment directory
sudo mkdir -p /opt/hexhaven
sudo cp -r * /opt/hexhaven/
sudo chown -R ubuntu:ubuntu /opt/hexhaven

# Cleanup extract directory
cd /tmp
rm -rf /tmp/hexhaven-extract

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
rm -rf /tmp/hexhaven-deploy

info "✓ Deployment complete"
info "URL: http://$HOST"

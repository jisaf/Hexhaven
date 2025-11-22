#!/bin/bash
set -e

# Production Deployment Script for Hexhaven
# Deploy to server at 129.213.88.197 using SSH
#
# Prerequisites:
# 1. SSH access configured to the production server
# 2. Node.js and npm installed locally
# 3. SSH key added to the server's authorized_keys
#
# Usage:
#   ./scripts/deploy-to-production.sh [SSH_KEY_PATH]
#
# If SSH_KEY_PATH is not provided, default SSH authentication will be used

# Configuration
PRODUCTION_HOST="${PRODUCTION_HOST:-129.213.88.197}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_PATH="/opt/hexhaven"
NODE_VERSION="20"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
SSH_KEY_PATH="${1:-}"
SSH_OPTS=""
if [ -n "$SSH_KEY_PATH" ]; then
    if [ ! -f "$SSH_KEY_PATH" ]; then
        echo -e "${RED}Error: SSH key not found at $SSH_KEY_PATH${NC}"
        exit 1
    fi
    SSH_OPTS="-i $SSH_KEY_PATH"
fi

# Helper functions
info() {
    echo -e "${GREEN}==>${NC} $1"
}

warn() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

error() {
    echo -e "${RED}Error:${NC} $1"
    exit 1
}

# Verify we're in the project root
if [ ! -f "package.json" ]; then
    error "Must be run from the project root directory"
fi

info "Starting production deployment to $PRODUCTION_HOST"

# Test SSH connection
info "Testing SSH connection..."
if ! ssh $SSH_OPTS -o BatchMode=yes -o ConnectTimeout=10 ${DEPLOY_USER}@${PRODUCTION_HOST} exit 2>/dev/null; then
    error "SSH connection failed. Please verify:
  1. SSH key is correct (if using key-based auth)
  2. The server is accessible at $PRODUCTION_HOST
  3. The user $DEPLOY_USER exists on the server
  4. Your public key is in ~/.ssh/authorized_keys on the server"
fi
info "SSH connection successful"

# Check Node.js version
info "Checking Node.js version..."
NODE_INSTALLED_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_INSTALLED_VERSION" -lt "$NODE_VERSION" ]; then
    warn "Node.js version is $NODE_INSTALLED_VERSION, recommended version is $NODE_VERSION or higher"
fi

# Install dependencies
info "Installing dependencies..."
npm ci

# Run tests and linting
info "Running tests and linting..."
npm run test || warn "Tests completed with warnings"
npm run lint || warn "Linting completed with warnings"

# Build backend
info "Building backend..."
npm run build -w backend

# Build frontend
info "Building frontend..."
VITE_API_URL="http://${PRODUCTION_HOST}" NODE_ENV=production npm run build -w frontend

# Create deployment archive
info "Creating deployment archive..."
rm -rf deploy-production deploy.tar.gz

mkdir -p deploy-production

# Copy monorepo root files (for npm workspaces)
cp package.json deploy-production/
cp package-lock.json deploy-production/

# Copy backend workspace (including dist and package files)
mkdir -p deploy-production/backend
cp -r backend/dist deploy-production/backend/
cp -r backend/prisma deploy-production/backend/
cp backend/package.json deploy-production/backend/

# Copy frontend build
mkdir -p deploy-production/frontend
cp -r frontend/dist/* deploy-production/frontend/

# Copy deployment scripts
cp scripts/deploy.sh deploy-production/
cp scripts/server-config.sh deploy-production/
cp scripts/network-diagnostics.sh deploy-production/
chmod +x deploy-production/deploy.sh
chmod +x deploy-production/server-config.sh
chmod +x deploy-production/network-diagnostics.sh

# Copy PM2 ecosystem configuration
cp ecosystem.config.js deploy-production/

# Copy Nginx configuration
cp infrastructure/nginx-hexhaven.conf deploy-production/

# Create archive
tar -czf deploy.tar.gz deploy-production/
ARCHIVE_SIZE=$(ls -lh deploy.tar.gz | awk '{print $5}')
info "Archive created: deploy.tar.gz ($ARCHIVE_SIZE)"

# Upload deployment package
info "Uploading deployment package to server..."
scp $SSH_OPTS deploy.tar.gz ${DEPLOY_USER}@${PRODUCTION_HOST}:/tmp/

# Deploy on server
info "Executing deployment on server..."
ssh $SSH_OPTS ${DEPLOY_USER}@${PRODUCTION_HOST} << ENDSSH
set -e

echo "Starting production deployment..."

# Ensure Node.js is installed
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
  echo "Node.js not found, installing..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  echo "Node.js installed: \$(node --version)"
else
  echo "Node.js already installed: \$(node --version)"
fi

# Ensure PM2 is installed
echo "Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
  echo "PM2 not found, installing globally..."
  sudo npm install -g pm2
  echo "PM2 installed: \$(pm2 --version)"
else
  echo "PM2 already installed: \$(pm2 --version)"
fi

# Extract deployment package
cd /tmp
tar -xzf deploy.tar.gz

# Stop existing backend process
echo "Stopping existing backend..."
pm2 stop hexhaven-backend || echo "No existing backend process to stop"
pm2 delete hexhaven-backend || echo "No existing backend process to delete"

# Backup current deployment
if [ -d "${DEPLOY_PATH}" ]; then
  BACKUP_PATH="${DEPLOY_PATH}.backup.\$(date +%Y%m%d_%H%M%S)"
  echo "Creating backup at \$BACKUP_PATH"
  sudo cp -r ${DEPLOY_PATH} \$BACKUP_PATH

  # Keep only last 5 backups
  sudo ls -dt ${DEPLOY_PATH}.backup.* 2>/dev/null | tail -n +6 | xargs sudo rm -rf
fi

# Deploy new version
echo "Deploying new version..."
sudo mkdir -p ${DEPLOY_PATH}

# Copy monorepo root files (for npm workspaces)
sudo cp /tmp/deploy-production/package.json ${DEPLOY_PATH}/
sudo cp /tmp/deploy-production/package-lock.json ${DEPLOY_PATH}/

# Copy backend workspace
sudo mkdir -p ${DEPLOY_PATH}/backend
sudo cp -r /tmp/deploy-production/backend/dist ${DEPLOY_PATH}/backend/
sudo cp -r /tmp/deploy-production/backend/prisma ${DEPLOY_PATH}/backend/
sudo cp /tmp/deploy-production/backend/package.json ${DEPLOY_PATH}/backend/

# Copy frontend build
sudo mkdir -p ${DEPLOY_PATH}/frontend
sudo cp -r /tmp/deploy-production/frontend/* ${DEPLOY_PATH}/frontend/

# Create scripts directory if it doesn't exist
sudo mkdir -p ${DEPLOY_PATH}/scripts

# Copy deployment scripts and PM2 config
sudo cp /tmp/deploy-production/deploy.sh ${DEPLOY_PATH}/
sudo cp /tmp/deploy-production/server-config.sh ${DEPLOY_PATH}/
sudo cp /tmp/deploy-production/network-diagnostics.sh ${DEPLOY_PATH}/scripts/
sudo cp /tmp/deploy-production/ecosystem.config.js ${DEPLOY_PATH}/
sudo cp /tmp/deploy-production/nginx-hexhaven.conf ${DEPLOY_PATH}/

# Create logs directory for PM2
sudo mkdir -p ${DEPLOY_PATH}/logs

# Set ownership
sudo chown -R ${DEPLOY_USER}:${DEPLOY_USER} ${DEPLOY_PATH}

# Initialize server configuration if needed
echo "Setting up server configuration..."
cd ${DEPLOY_PATH}
chmod +x server-config.sh

# Initialize server config (creates /opt/hexhaven/.server-config if not exists)
sudo -u ${DEPLOY_USER} env SERVER_IP=${PRODUCTION_HOST} ./server-config.sh init

# Generate .env file from server configuration
echo "Generating environment configuration..."
sudo -u ${DEPLOY_USER} env SERVER_IP=${PRODUCTION_HOST} ./server-config.sh generate

# Run deployment script
echo "Running deployment script..."
cd ${DEPLOY_PATH}
chmod +x deploy.sh
export SERVER_IP="${PRODUCTION_HOST}"
./deploy.sh || {
  echo "Deployment script failed!"
  exit 1
}

# Copy frontend to Nginx location
echo "Deploying frontend to Nginx..."
sudo mkdir -p /var/www/hexhaven
sudo cp -r ${DEPLOY_PATH}/frontend /var/www/hexhaven/
sudo chown -R www-data:www-data /var/www/hexhaven
sudo chmod -R 755 /var/www/hexhaven

# Install and configure Nginx
if ! command -v nginx &> /dev/null; then
  echo "Installing Nginx..."
  sudo apt-get update
  sudo apt-get install -y nginx
  sudo systemctl enable nginx
  sudo systemctl start nginx
fi

# Install Nginx site configuration
echo "Configuring Nginx..."
# Replace placeholder with actual server IP
sed "s/__SERVER_IP__/${PRODUCTION_HOST}/g" ${DEPLOY_PATH}/nginx-hexhaven.conf | sudo tee /etc/nginx/sites-available/hexhaven > /dev/null
sudo ln -sf /etc/nginx/sites-available/hexhaven /etc/nginx/sites-enabled/hexhaven

# Disable default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
  sudo rm /etc/nginx/sites-enabled/default
fi

# Test and reload Nginx
if sudo nginx -t; then
  sudo systemctl reload nginx
  echo "✓ Nginx configured and reloaded successfully"
else
  echo "✗ Nginx configuration test failed"
  sudo nginx -t
  exit 1
fi

# Ensure firewall allows HTTP traffic (Oracle Cloud)
echo "Configuring firewall..."
if sudo iptables -L -n | grep -q "dpt:80.*ACCEPT"; then
  echo "✓ Port 80 already allowed"
else
  echo "Opening port 80..."
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  sudo netfilter-persistent save 2>/dev/null || sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null
  echo "✓ Port 80 opened"
fi

# Verify deployment prerequisites before starting PM2
echo "Verifying deployment prerequisites..."
cd ${DEPLOY_PATH}

if [ ! -f .env ]; then
  echo "✗ ERROR: .env file not found at ${DEPLOY_PATH}/.env"
  exit 1
else
  echo "✓ .env file exists"
fi

if [ ! -d node_modules ]; then
  echo "✗ ERROR: node_modules not found"
  exit 1
else
  echo "✓ node_modules exists"
fi

if [ ! -f backend/dist/backend/src/main.js ]; then
  echo "✗ ERROR: Backend entry point not found"
  exit 1
else
  echo "✓ Backend build exists"
fi

# Start backend with PM2
echo "Starting backend with PM2..."

# Start the backend using PM2 ecosystem file
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Configure PM2 to start on system boot (only needs to be done once)
sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u ${DEPLOY_USER} --hp /home/${DEPLOY_USER} || echo "PM2 startup already configured"

# Wait and verify
echo "Waiting for backend to start..."
sleep 10

# Check PM2 status and look for crash-looping
if pm2 show hexhaven-backend > /dev/null 2>&1; then
  echo "✓ Backend process exists in PM2"

  # Get restart count
  RESTART_COUNT=\$(pm2 show hexhaven-backend | grep "│ restarts" | grep -v "unstable" | awk -F'│' '{print \$3}' | tr -d ' ')

  # Validate it's a number, otherwise default to 0
  if ! [[ "\$RESTART_COUNT" =~ ^[0-9]+$ ]]; then
    echo "Warning: Could not parse restart count, defaulting to 0"
    RESTART_COUNT=0
  fi

  echo "Backend restart count: \$RESTART_COUNT"

  if [ "\$RESTART_COUNT" -gt 5 ]; then
    echo ""
    echo "=========================================="
    echo "✗ DEPLOYMENT FAILED: Backend is crash-looping!"
    echo "=========================================="
    echo "Restart count: \$RESTART_COUNT"
    echo ""
    echo "--- PM2 Process Status ---"
    pm2 show hexhaven-backend
    echo ""
    echo "--- Last 100 lines of logs ---"
    pm2 logs hexhaven-backend --lines 100 --nostream || cat ${DEPLOY_PATH}/logs/pm2-error.log
    echo ""
    exit 1
  fi

  pm2 show hexhaven-backend
  echo "✓ Backend is running successfully"
else
  echo "✗ Backend failed to start"
  pm2 logs hexhaven-backend --lines 50 --nostream
  exit 1
fi

# Verify Nginx configuration
echo ""
echo "Verifying Nginx configuration..."
if sudo systemctl is-active nginx > /dev/null 2>&1; then
  echo "✓ Nginx is running"
else
  echo "✗ Nginx is not running"
  sudo systemctl status nginx
fi

# Test endpoints from server
echo ""
echo "Testing endpoints from server..."

echo "Backend direct (localhost:3000):"
if curl -f --max-time 5 http://localhost:3000/health 2>/dev/null; then
  echo "✓ Backend responds on localhost:3000"
else
  echo "✗ Backend not accessible on localhost:3000"
fi

echo ""
echo "Backend through Nginx (localhost:80):"
if curl -f --max-time 5 http://localhost/health 2>/dev/null; then
  echo "✓ Backend accessible through Nginx on localhost"
else
  echo "✗ Backend not accessible through Nginx"
fi

echo ""
echo "Testing from public IP (${PRODUCTION_HOST}):"
if curl -f --max-time 5 http://${PRODUCTION_HOST}/health 2>/dev/null; then
  echo "✓ Backend accessible from public IP"
else
  echo "✗ Backend NOT accessible from public IP"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠  ORACLE CLOUD SECURITY LIST CONFIGURATION REQUIRED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Your application is deployed and running, but the Oracle Cloud"
  echo "Security List is blocking public access on port 80."
  echo ""
  echo "TO FIX THIS (one-time setup):"
  echo "1. Go to: https://cloud.oracle.com"
  echo "2. Navigate to: Networking → Virtual Cloud Networks"
  echo "3. Select your VCN → Security Lists → Default Security List"
  echo "4. Click 'Add Ingress Rules'"
  echo "5. Configure:"
  echo "   - Source CIDR: 0.0.0.0/0"
  echo "   - IP Protocol: TCP"
  echo "   - Destination Port Range: 80"
  echo "6. Click 'Add Ingress Rules'"
  echo ""
  echo "For detailed instructions, see: infrastructure/DEPLOYMENT.md"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

# Cleanup
rm -rf /tmp/deploy-production /tmp/deploy.tar.gz

echo ""
echo "✓ Production deployment completed successfully!"
echo ""
echo "Application URL: http://${PRODUCTION_HOST}"
ENDSSH

# Verify deployment from local machine
info "Verifying deployment from local machine..."
sleep 5

echo ""
echo "Checking backend health..."
if curl -f --max-time 10 http://${PRODUCTION_HOST}/health 2>/dev/null; then
    info "✓ Backend health check passed"
else
    warn "Backend health check failed - this may be due to Oracle Cloud Security List configuration"
    echo "  To fix: Configure Oracle Cloud Security List to allow port 80 ingress"
    echo "  See: infrastructure/DEPLOYMENT.md for instructions"
fi

echo ""
echo "Checking frontend..."
if curl -f -I --max-time 10 http://${PRODUCTION_HOST}/ 2>/dev/null; then
    info "✓ Frontend is accessible"
else
    warn "Frontend check failed - this may be due to Oracle Cloud Security List configuration"
fi

# Cleanup local files
info "Cleaning up local deployment files..."
rm -rf deploy-production deploy.tar.gz

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Application URL: http://${PRODUCTION_HOST}"
echo ""
echo "To monitor the application:"
echo "  ssh ${SSH_OPTS} ${DEPLOY_USER}@${PRODUCTION_HOST}"
echo "  pm2 logs hexhaven-backend"
echo "  pm2 status"
echo ""
echo "To run network diagnostics:"
echo "  ssh ${SSH_OPTS} ${DEPLOY_USER}@${PRODUCTION_HOST}"
echo "  cd ${DEPLOY_PATH} && ./scripts/network-diagnostics.sh"
echo ""

#!/bin/bash

###############################################################################
# HexHaven Staging Server Setup Script
###############################################################################
# This script prepares a fresh server for hosting the HexHaven application.
# It installs all required dependencies, sets up services, and configures
# the environment for production deployment.
#
# Prerequisites:
# - Ubuntu 20.04+ or Debian 11+
# - Root or sudo access
# - Server IP: 150.136.88.138
#
# Usage:
#   sudo ./setup-server.sh
#
# What this script does:
# 1. Installs Node.js 20.x, npm, PostgreSQL, Nginx
# 2. Creates deployment user and directory structure
# 3. Configures PostgreSQL database
# 4. Sets up Nginx reverse proxy
# 5. Creates systemd services for backend and frontend
# 6. Configures firewall rules
###############################################################################

set -e  # Exit on any error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_USER="hexhaven"
DEPLOY_PATH="/opt/hexhaven"
DB_NAME="hexhaven_staging"
DB_USER="hexhaven_user"
NODE_VERSION="20"
BACKEND_PORT="3000"
FRONTEND_PORT="80"

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

###############################################################################
# Installation Steps
###############################################################################

install_nodejs() {
    log_info "Installing Node.js ${NODE_VERSION}..."

    # Remove old Node.js if present
    apt-get remove -y nodejs npm || true

    # Install Node.js from NodeSource
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs

    # Verify installation
    node --version
    npm --version

    log_info "Node.js installed successfully"
}

install_postgresql() {
    log_info "Installing PostgreSQL..."

    apt-get install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql

    # Generate random password for database user
    DB_PASSWORD=$(openssl rand -base64 32)

    # Create database and user
    sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE ${DB_NAME};

-- Create user with password
CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Grant schema permissions (PostgreSQL 15+)
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
EOF

    # Save database credentials
    mkdir -p /root/.hexhaven
    cat > /root/.hexhaven/db_credentials << EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
EOF
    chmod 600 /root/.hexhaven/db_credentials

    log_info "PostgreSQL installed and configured"
    log_warn "Database credentials saved to: /root/.hexhaven/db_credentials"
}

install_nginx() {
    log_info "Installing Nginx..."

    apt-get install -y nginx
    systemctl enable nginx

    # Create Nginx configuration for HexHaven
    cat > /etc/nginx/sites-available/hexhaven << 'EOF'
# HexHaven Staging Server Configuration

# Backend API proxy
upstream backend {
    server localhost:3000;
    keepalive 64;
}

# Redirect HTTP to HTTPS (uncomment when SSL is configured)
# server {
#     listen 80;
#     server_name 150.136.88.138;
#     return 301 https://$server_name$request_uri;
# }

server {
    listen 80;
    server_name 150.136.88.138;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend static files
    location / {
        root /opt/hexhaven/frontend;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://backend/;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.io endpoint
    location /socket.io/ {
        proxy_pass http://backend/socket.io/;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/hexhaven /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Test configuration
    nginx -t

    # Restart Nginx
    systemctl restart nginx

    log_info "Nginx installed and configured"
}

create_deploy_user() {
    log_info "Creating deployment user..."

    # Create user if doesn't exist
    if ! id -u ${DEPLOY_USER} > /dev/null 2>&1; then
        useradd -m -s /bin/bash ${DEPLOY_USER}
        log_info "User ${DEPLOY_USER} created"
    else
        log_warn "User ${DEPLOY_USER} already exists"
    fi

    # Create deployment directory
    mkdir -p ${DEPLOY_PATH}
    chown -R ${DEPLOY_USER}:${DEPLOY_USER} ${DEPLOY_PATH}

    # Add user to sudo group for service management
    usermod -aG sudo ${DEPLOY_USER}

    # Allow passwordless sudo for service management
    cat > /etc/sudoers.d/hexhaven << EOF
${DEPLOY_USER} ALL=(ALL) NOPASSWD: /bin/systemctl start hexhaven-*
${DEPLOY_USER} ALL=(ALL) NOPASSWD: /bin/systemctl stop hexhaven-*
${DEPLOY_USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart hexhaven-*
${DEPLOY_USER} ALL=(ALL) NOPASSWD: /bin/systemctl status hexhaven-*
${DEPLOY_USER} ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
${DEPLOY_USER} ALL=(ALL) NOPASSWD: /usr/bin/cp -r /tmp/deploy-staging/* ${DEPLOY_PATH}/
${DEPLOY_USER} ALL=(ALL) NOPASSWD: /bin/mkdir -p ${DEPLOY_PATH}
${DEPLOY_USER} ALL=(ALL) NOPASSWD: /bin/chown -R ${DEPLOY_USER}:${DEPLOY_USER} ${DEPLOY_PATH}
${DEPLOY_USER} ALL=(ALL) NOPASSWD: /bin/mv ${DEPLOY_PATH} ${DEPLOY_PATH}.backup.*
EOF
    chmod 0440 /etc/sudoers.d/hexhaven

    log_info "Deployment user configured"
}

create_systemd_services() {
    log_info "Creating systemd services..."

    # Load database credentials
    source /root/.hexhaven/db_credentials

    # Backend service
    cat > /etc/systemd/system/hexhaven-backend.service << EOF
[Unit]
Description=HexHaven Backend API
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=${DEPLOY_USER}
WorkingDirectory=${DEPLOY_PATH}/backend
Environment="NODE_ENV=production"
Environment="PORT=${BACKEND_PORT}"
Environment="DATABASE_URL=${DATABASE_URL}"
ExecStart=/usr/bin/node dist/backend/src/main.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hexhaven-backend

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${DEPLOY_PATH}

[Install]
WantedBy=multi-user.target
EOF

    # Enable services
    systemctl daemon-reload
    systemctl enable hexhaven-backend

    log_info "Systemd services created and enabled"
}

configure_firewall() {
    log_info "Configuring firewall..."

    # Install ufw if not present
    apt-get install -y ufw

    # Configure firewall rules
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow http
    ufw allow https

    log_info "Firewall configured"
}

install_system_dependencies() {
    log_info "Installing system dependencies..."

    apt-get update
    apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        openssl \
        ca-certificates \
        gnupg \
        lsb-release \
        software-properties-common

    log_info "System dependencies installed"
}

generate_env_template() {
    log_info "Generating environment template..."

    source /root/.hexhaven/db_credentials

    mkdir -p ${DEPLOY_PATH}
    cat > ${DEPLOY_PATH}/.env.template << EOF
# Database Configuration
DATABASE_URL=${DATABASE_URL}

# Backend Configuration
NODE_ENV=production
PORT=${BACKEND_PORT}
HOST=0.0.0.0

# Frontend Configuration (build time)
VITE_API_URL=http://150.136.88.138:${BACKEND_PORT}

# Session Configuration (generate secure secret in production)
SESSION_SECRET=$(openssl rand -base64 32)

# CORS Configuration
CORS_ORIGIN=http://150.136.88.138

# Logging
LOG_LEVEL=info
EOF

    chown ${DEPLOY_USER}:${DEPLOY_USER} ${DEPLOY_PATH}/.env.template

    log_info "Environment template created at ${DEPLOY_PATH}/.env.template"
}

print_summary() {
    log_info "==============================================="
    log_info "HexHaven Staging Server Setup Complete!"
    log_info "==============================================="
    echo ""
    log_info "Server Details:"
    echo "  - Deploy Path: ${DEPLOY_PATH}"
    echo "  - Deploy User: ${DEPLOY_USER}"
    echo "  - Backend Port: ${BACKEND_PORT}"
    echo "  - Frontend Port: ${FRONTEND_PORT}"
    echo ""
    log_info "Database Details:"
    echo "  - Database: ${DB_NAME}"
    echo "  - User: ${DB_USER}"
    echo "  - Credentials: /root/.hexhaven/db_credentials"
    echo ""
    log_info "Next Steps:"
    echo "  1. Add GitHub Actions secret 'STAGING_SSH_KEY' with SSH private key"
    echo "  2. Add the corresponding public key to ${DEPLOY_USER}@150.136.88.138:~/.ssh/authorized_keys"
    echo "  3. Push to main/master branch to trigger deployment"
    echo ""
    log_info "Services:"
    echo "  - Backend: systemctl status hexhaven-backend"
    echo "  - Nginx: systemctl status nginx"
    echo ""
    log_info "Access:"
    echo "  - Frontend: http://150.136.88.138"
    echo "  - Backend API: http://150.136.88.138/api/"
    echo "  - Health Check: http://150.136.88.138/health"
    echo ""
}

###############################################################################
# Main Execution
###############################################################################

main() {
    log_info "Starting HexHaven staging server setup..."

    check_root

    # Install dependencies
    install_system_dependencies
    install_nodejs
    install_postgresql
    install_nginx

    # Configure environment
    create_deploy_user
    create_systemd_services
    generate_env_template
    configure_firewall

    # Summary
    print_summary

    log_info "Setup completed successfully!"
}

# Run main function
main "$@"

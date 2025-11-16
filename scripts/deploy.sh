#!/bin/bash

###############################################################################
# HexHaven Deployment Script
###############################################################################
# This script runs on the staging server during each deployment.
# It handles dependency installation, database migrations, and service setup.
#
# Usage:
#   ./deploy.sh
#
# This script is executed by the GitHub Actions workflow after code is
# uploaded to the server. It runs in the deployment directory.
###############################################################################

set -e  # Exit on any error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_PATH="/opt/hexhaven"
BACKEND_DIR="${DEPLOY_PATH}/backend"
FRONTEND_DIR="${DEPLOY_PATH}/frontend"
ENV_FILE="${DEPLOY_PATH}/.env"
ENV_TEMPLATE="${DEPLOY_PATH}/.env.template"

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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

check_directory() {
    if [ ! -d "$1" ]; then
        log_error "Directory not found: $1"
        exit 1
    fi
}

###############################################################################
# Deployment Steps
###############################################################################

setup_environment() {
    log_step "Setting up environment variables..."

    # Check if .env exists (created from GitHub secrets during deployment)
    if [ ! -f "${ENV_FILE}" ]; then
        # Fallback: Copy environment template if available
        if [ -f "${ENV_TEMPLATE}" ]; then
            log_warn "No .env file found, creating from template..."
            log_warn "For production deployments, .env should be created from GitHub secrets"
            cp "${ENV_TEMPLATE}" "${ENV_FILE}"
        else
            log_error "No .env file found!"
            log_error "Expected .env to be created from GitHub secrets during deployment"
            exit 1
        fi
    else
        log_info "Using .env file (created from GitHub secrets)"
    fi

    # Verify .env has required variables
    if ! grep -q "DATABASE_URL" "${ENV_FILE}"; then
        log_error ".env file is missing required DATABASE_URL variable"
        exit 1
    fi

    # Load environment variables
    set -a
    source "${ENV_FILE}"
    set +a

    log_info "Environment configured"
}

install_backend_dependencies() {
    log_step "Installing backend dependencies..."

    # This is a monorepo, so install from root using workspaces
    check_directory "${DEPLOY_PATH}"
    cd "${DEPLOY_PATH}"

    # Check if root package.json and package-lock.json exist
    if [ ! -f "package.json" ] || [ ! -f "package-lock.json" ]; then
        log_error "Missing package.json or package-lock.json in ${DEPLOY_PATH}"
        log_error "Monorepo deployment requires root package files"
        exit 1
    fi

    # Install dependencies for the backend workspace
    log_info "Installing workspace dependencies..."
    npm ci --workspace=backend

    log_info "Backend dependencies installed"
}

run_database_migrations() {
    log_step "Running database migrations..."

    check_directory "${BACKEND_DIR}"

    # Check if Prisma is configured
    if [ ! -f "${BACKEND_DIR}/prisma/schema.prisma" ]; then
        log_warn "No Prisma schema found, skipping migrations"
        return 0
    fi

    # Run from monorepo root using workspace
    cd "${DEPLOY_PATH}"

    # Generate Prisma client
    log_info "Generating Prisma client..."
    npm run prisma:generate --workspace=backend

    # Run migrations
    log_info "Applying database migrations..."
    npm run prisma:migrate:deploy --workspace=backend

    # Optional: Seed database (uncomment if needed)
    # log_info "Seeding database..."
    # npm run db:seed --workspace=backend || log_warn "Database seeding failed or not configured"

    log_info "Database migrations completed"
}

verify_backend_build() {
    log_step "Verifying backend build..."

    check_directory "${BACKEND_DIR}"
    cd "${BACKEND_DIR}"

    if [ ! -d "dist" ]; then
        log_error "Backend dist directory not found! Build may have failed."
        exit 1
    fi

    if [ ! -f "dist/backend/src/main.js" ]; then
        log_error "Backend entry point not found at dist/backend/src/main.js"
        exit 1
    fi

    log_info "Backend build verified"
}

verify_frontend_build() {
    log_step "Verifying frontend build..."

    check_directory "${FRONTEND_DIR}"

    if [ ! -f "${FRONTEND_DIR}/index.html" ]; then
        log_error "Frontend index.html not found! Build may have failed."
        exit 1
    fi

    log_info "Frontend build verified"
}

create_deployment_marker() {
    log_step "Creating deployment marker..."

    cat > "${DEPLOY_PATH}/DEPLOYMENT_INFO.txt" << EOF
Deployment Information
======================

Deployment Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Deployed By: GitHub Actions
Git Commit: ${GITHUB_SHA:-"N/A"}
Git Branch: ${GITHUB_REF_NAME:-"N/A"}
Workflow Run: ${GITHUB_RUN_NUMBER:-"N/A"}

Backend Status: $(systemctl is-active hexhaven-backend || echo "not running")
Frontend Status: $(systemctl is-active nginx || echo "not running")

Environment: production/staging
Node Version: $(node --version)
NPM Version: $(npm --version)
EOF

    log_info "Deployment marker created"
}

check_health() {
    log_step "Performing health checks..."

    # Wait for backend to start
    log_info "Waiting for backend to start..."
    sleep 5

    # Check if backend service is running
    if systemctl is-active --quiet hexhaven-backend; then
        log_info "Backend service is active"
    else
        log_warn "Backend service is not active yet"
    fi

    # Check backend port
    if netstat -tuln | grep -q ":3000"; then
        log_info "Backend is listening on port 3000"
    else
        log_warn "Backend is not listening on port 3000"
    fi

    # Check Nginx
    if systemctl is-active --quiet nginx; then
        log_info "Nginx service is active"
    else
        log_warn "Nginx service is not active"
    fi

    log_info "Health checks completed"
}

cleanup_old_backups() {
    log_step "Cleaning up old backups..."

    # Keep only last 5 backups
    cd /opt
    ls -dt hexhaven.backup.* 2>/dev/null | tail -n +6 | xargs rm -rf || true

    log_info "Old backups cleaned up"
}

print_deployment_summary() {
    log_info "==============================================="
    log_info "Deployment Summary"
    log_info "==============================================="
    echo ""
    log_info "Deployment completed successfully!"
    echo ""
    log_info "Services:"
    echo "  - Backend: systemctl status hexhaven-backend"
    echo "  - Nginx: systemctl status nginx"
    echo ""
    log_info "Logs:"
    echo "  - Backend: journalctl -u hexhaven-backend -f"
    echo "  - Nginx: tail -f /var/log/nginx/error.log"
    echo ""
    log_info "Access:"
    echo "  - Frontend: http://150.136.88.138"
    echo "  - Backend API: http://150.136.88.138/api/"
    echo "  - Health: http://150.136.88.138/health"
    echo ""
    log_info "Deployment info: ${DEPLOY_PATH}/DEPLOYMENT_INFO.txt"
    echo ""
}

###############################################################################
# Main Execution
###############################################################################

main() {
    log_info "Starting deployment process..."
    echo ""

    # Ensure we're in the deployment directory
    cd "${DEPLOY_PATH}"

    # Execute deployment steps
    setup_environment
    install_backend_dependencies
    run_database_migrations
    verify_backend_build
    verify_frontend_build
    create_deployment_marker
    cleanup_old_backups

    # Note: Services are started by the GitHub Actions workflow
    # This script focuses on preparing the deployment

    check_health
    print_deployment_summary

    log_info "Deployment script completed successfully!"
}

# Run main function
main "$@"

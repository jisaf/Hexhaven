#!/bin/bash

###############################################################################
# Server Configuration Manager
###############################################################################
# This script manages persistent server configuration that survives deployments
# It stores database credentials and other server-specific settings
###############################################################################

set -e

CONFIG_FILE="/opt/hexhaven/.server-config"
DEPLOY_PATH="/opt/hexhaven"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

###############################################################################
# Initialize server configuration
###############################################################################
init_config() {
    log_info "Initializing server configuration..."

    # Create config directory if needed
    sudo mkdir -p "$(dirname "$CONFIG_FILE")"

    # Create initial config file if it doesn't exist
    if [ ! -f "$CONFIG_FILE" ]; then
        log_info "Creating new server configuration..."

        # Auto-detect or prompt for database configuration
        local db_host="${DB_HOST:-localhost}"
        local db_port="${DB_PORT:-5432}"
        local db_name="${DB_NAME:-hexhaven_production}"
        local db_user="${DB_USER:-hexhaven_user}"
        local db_password="${DB_PASSWORD:-hexhaven_production_password_CHANGE_ME}"

        # Warn if using default password
        if [ "$db_password" = "hexhaven_production_password_CHANGE_ME" ]; then
            log_warn "Using default database password."
            log_warn "IMPORTANT: Change the password in production!"
            log_warn "Update $CONFIG_FILE with a secure DATABASE_URL password."
        fi

        # Get server IP from environment or use default
        local server_ip="${SERVER_IP:-}"
        if [ -z "$server_ip" ]; then
            # Try to auto-detect the primary IP
            server_ip=$(ip -4 addr show | grep inet | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d/ -f1 || echo "localhost")
        fi

        # Create config file
        sudo bash -c "cat > $CONFIG_FILE" << EOF
# Hexhaven Server Configuration
# This file persists across deployments
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Database Configuration
DATABASE_URL="postgresql://${db_user}:${db_password}@${db_host}:${db_port}/${db_name}?schema=public"

# Server Settings
HOST=0.0.0.0
PORT=3000

# CORS and Frontend (auto-detected server IP: ${server_ip})
CORS_ORIGIN=http://${server_ip}
FRONTEND_URL=http://${server_ip}

# Logging
LOG_LEVEL=info

# Optional: External Services (uncomment to enable)
# REDIS_URL=redis://localhost:6379
# SENTRY_DSN=
EOF

        sudo chmod 600 "$CONFIG_FILE"
        sudo chown ubuntu:ubuntu "$CONFIG_FILE"

        log_info "Server configuration created at: $CONFIG_FILE"
        log_warn "IMPORTANT: Update DATABASE_URL in $CONFIG_FILE with correct credentials!"
    else
        log_info "Server configuration already exists at: $CONFIG_FILE"
    fi
}

###############################################################################
# Generate environment file from server config + deployment settings
###############################################################################
generate_env() {
    local output_file="${1:-$DEPLOY_PATH/.env}"

    log_info "Generating environment file: $output_file"

    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Server configuration not found. Run: $0 init"
        exit 1
    fi

    # Generate new session secret for this deployment
    local session_secret=$(openssl rand -base64 32)

    # Read database URL from server config
    local database_url=$(grep "^DATABASE_URL=" "$CONFIG_FILE" | cut -d= -f2- | tr -d '"')

    if [ -z "$database_url" ]; then
        log_error "DATABASE_URL not found in $CONFIG_FILE"
        exit 1
    fi

    # Detect server IP for fallback
    local server_ip="${SERVER_IP:-$(ip -4 addr show | grep inet | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d/ -f1 || echo "localhost")}"

    # Read other values from config with defaults
    local host=$(grep "^HOST=" "$CONFIG_FILE" | cut -d= -f2- | tr -d '"' || echo "0.0.0.0")
    local port=$(grep "^PORT=" "$CONFIG_FILE" | cut -d= -f2- | tr -d '"' || echo "3000")
    local cors_origin=$(grep "^CORS_ORIGIN=" "$CONFIG_FILE" | cut -d= -f2- | tr -d '"' || echo "http://${server_ip}")
    local frontend_url=$(grep "^FRONTEND_URL=" "$CONFIG_FILE" | cut -d= -f2- | tr -d '"' || echo "http://${server_ip}")
    local log_level=$(grep "^LOG_LEVEL=" "$CONFIG_FILE" | cut -d= -f2- | tr -d '"' || echo "info")
    local redis_url=$(grep "^REDIS_URL=" "$CONFIG_FILE" | cut -d= -f2- | tr -d '"' || echo "")
    local sentry_dsn=$(grep "^SENTRY_DSN=" "$CONFIG_FILE" | cut -d= -f2- | tr -d '"' || echo "")

    # Create .env file
    cat > "$output_file" << EOF
# Hexhaven Production Environment
# Auto-generated from server configuration
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Node Environment
NODE_ENV=production

# Server Configuration
HOST=${host}
PORT=${port}

# Database Configuration
DATABASE_URL=${database_url}

# CORS Configuration
CORS_ORIGIN=${cors_origin}

# Session Configuration (auto-generated for this deployment)
SESSION_SECRET=${session_secret}

# WebSocket Configuration
WS_PATH=/socket.io

# Logging
LOG_LEVEL=${log_level}

# Frontend URLs
FRONTEND_URL=${frontend_url}
EOF

    # Add optional services if configured
    if [ -n "$redis_url" ]; then
        echo "REDIS_URL=${redis_url}" >> "$output_file"
    fi

    if [ -n "$sentry_dsn" ]; then
        echo "SENTRY_DSN=${sentry_dsn}" >> "$output_file"
    fi

    chmod 600 "$output_file"

    log_info "Environment file generated successfully"
    log_info "  Database: $(echo "$database_url" | sed 's/:[^:@]*@/:***@/')"  # Hide password
    log_info "  Session Secret: [AUTO-GENERATED]"
}

###############################################################################
# Display current configuration
###############################################################################
show_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Server configuration not found. Run: $0 init"
        exit 1
    fi

    log_info "Current server configuration:"
    echo ""

    # Show config with passwords masked
    grep -v "^#" "$CONFIG_FILE" | grep -v "^$" | while read -r line; do
        if [[ "$line" =~ PASSWORD|SECRET|DSN ]]; then
            key=$(echo "$line" | cut -d= -f1)
            echo "  $key=***REDACTED***"
        elif [[ "$line" =~ DATABASE_URL ]]; then
            # Mask password in DATABASE_URL
            echo "  $line" | sed 's/:[^:@]*@/:***@/'
        else
            echo "  $line"
        fi
    done

    echo ""
}

###############################################################################
# Update configuration value
###############################################################################
update_config() {
    local key="$1"
    local value="$2"

    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Server configuration not found. Run: $0 init"
        exit 1
    fi

    if [ -z "$key" ] || [ -z "$value" ]; then
        log_error "Usage: $0 update KEY VALUE"
        exit 1
    fi

    log_info "Updating configuration: $key"

    # Update or add the key
    if grep -q "^${key}=" "$CONFIG_FILE"; then
        sudo sed -i "s|^${key}=.*|${key}=\"${value}\"|" "$CONFIG_FILE"
    else
        echo "${key}=\"${value}\"" | sudo tee -a "$CONFIG_FILE" > /dev/null
    fi

    log_info "Configuration updated. Redeploy to apply changes."
}

###############################################################################
# Main
###############################################################################
case "${1:-}" in
    init)
        init_config
        ;;
    generate)
        generate_env "${2:-}"
        ;;
    show)
        show_config
        ;;
    update)
        update_config "${2:-}" "${3:-}"
        ;;
    *)
        echo "Hexhaven Server Configuration Manager"
        echo ""
        echo "Usage: $0 COMMAND [OPTIONS]"
        echo ""
        echo "Commands:"
        echo "  init              Initialize server configuration"
        echo "  generate [FILE]   Generate .env file from server config (default: /opt/hexhaven/.env)"
        echo "  show              Display current configuration"
        echo "  update KEY VALUE  Update configuration value"
        echo ""
        echo "Examples:"
        echo "  $0 init"
        echo "  $0 show"
        echo "  $0 update DATABASE_URL 'postgresql://user:pass@localhost:5432/db'"
        echo "  $0 generate"
        exit 1
        ;;
esac

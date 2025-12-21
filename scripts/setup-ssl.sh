#!/bin/bash
# SSL Setup Script for hexhaven servers
# This script sets up Let's Encrypt SSL certificates using certbot

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. It will use sudo when needed."
    exit 1
fi

# Function to setup SSL
setup_ssl() {
    local domain=$1
    local extra_domains=$2
    local email=$3

    print_info "Setting up SSL for $domain"

    # Install certbot if not already installed
    if ! command -v certbot &> /dev/null; then
        print_info "Installing certbot..."
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    else
        print_info "Certbot already installed"
    fi

    # Create ACME challenge directory
    print_info "Creating ACME challenge directory..."
    sudo mkdir -p /var/www/html/.well-known/acme-challenge

    # Check nginx configuration
    print_info "Checking nginx configuration..."
    sudo nginx -t

    # Build certbot command
    local certbot_cmd="sudo certbot --nginx -d $domain"

    if [ -n "$extra_domains" ]; then
        certbot_cmd="$certbot_cmd $extra_domains"
    fi

    certbot_cmd="$certbot_cmd --non-interactive --agree-tos --redirect"

    if [ -n "$email" ]; then
        certbot_cmd="$certbot_cmd --email $email"
    else
        certbot_cmd="$certbot_cmd --register-unsafely-without-email"
        print_warning "No email provided. You will not receive certificate expiration notifications."
    fi

    # Obtain SSL certificate
    print_info "Obtaining SSL certificate..."
    eval $certbot_cmd

    # Test SSL renewal
    print_info "Testing SSL renewal (dry-run)..."
    sudo certbot renew --dry-run

    print_info "SSL setup completed successfully!"
    print_info "Your site is now available at: https://$domain"
}

# Main script
main() {
    # Get hostname to determine which server we're on
    local hostname=$(hostname)

    print_info "Current hostname: $hostname"

    # Ask user which domain to setup
    echo ""
    echo "Which domain would you like to setup SSL for?"
    echo "1) hexhaven.net (production)"
    echo "2) dev.hexhaven.net (development)"
    echo "3) test.hexhaven.net (test)"
    read -p "Enter choice [1-3]: " choice

    case $choice in
        1)
            DOMAIN="hexhaven.net"
            EXTRA_DOMAINS="-d www.hexhaven.net"
            ;;
        2)
            DOMAIN="dev.hexhaven.net"
            EXTRA_DOMAINS=""
            ;;
        3)
            DOMAIN="test.hexhaven.net"
            EXTRA_DOMAINS=""
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac

    # Ask for email
    read -p "Enter email for certificate notifications (or press Enter to skip): " EMAIL

    # Confirm
    echo ""
    print_warning "This will setup SSL for: $DOMAIN $EXTRA_DOMAINS"
    read -p "Continue? [y/N]: " confirm

    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        print_info "Aborted"
        exit 0
    fi

    # Setup SSL
    setup_ssl "$DOMAIN" "$EXTRA_DOMAINS" "$EMAIL"
}

# Run main function
main

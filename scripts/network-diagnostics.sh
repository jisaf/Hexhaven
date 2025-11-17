#!/bin/bash

###############################################################################
# Network Diagnostics Script for Hexhaven Production
###############################################################################
# This script diagnoses network connectivity issues on Oracle Cloud
# Run this on the production server to identify firewall/network problems
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_info() {
    echo -e "  $1"
}

###############################################################################
# Check 1: Detect Server IP
###############################################################################
check_server_ip() {
    log_header "1. Server IP Detection"

    # Get primary IP
    PRIMARY_IP=$(ip -4 addr show | grep inet | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d/ -f1 || echo "")

    if [ -n "$PRIMARY_IP" ]; then
        log_success "Primary IP detected: $PRIMARY_IP"
    else
        log_error "Could not detect primary IP address"
        return 1
    fi

    # Get public IP (Oracle Cloud metadata service)
    echo ""
    log_info "Attempting to get public IP from Oracle Cloud metadata..."
    PUBLIC_IP=$(curl -s -H "Authorization: Bearer Oracle" -L http://169.254.169.254/opc/v2/instance/ 2>/dev/null | grep -o '"publicIp":"[^"]*"' | cut -d'"' -f4 || echo "")

    if [ -n "$PUBLIC_IP" ]; then
        log_success "Public IP from OCI metadata: $PUBLIC_IP"
    else
        log_warn "Could not retrieve public IP from OCI metadata"
        log_info "Using primary IP: $PRIMARY_IP"
        PUBLIC_IP="$PRIMARY_IP"
    fi

    export SERVER_IP="$PUBLIC_IP"
}

###############################################################################
# Check 2: Port Listening Status
###############################################################################
check_listening_ports() {
    log_header "2. Port Listening Status"

    # Check port 3000 (Backend)
    if sudo ss -tlnp | grep -q ":3000"; then
        log_success "Port 3000 (Backend) is listening"
        sudo ss -tlnp | grep ":3000" | head -1 | sed 's/^/  /'
    else
        log_error "Port 3000 (Backend) is NOT listening"
        log_info "Backend may not be running. Check: pm2 status"
    fi

    echo ""

    # Check port 80 (Nginx)
    if sudo ss -tlnp | grep -q ":80"; then
        log_success "Port 80 (HTTP/Nginx) is listening"
        sudo ss -tlnp | grep ":80" | head -1 | sed 's/^/  /'
    else
        log_error "Port 80 (HTTP) is NOT listening"
        log_info "Nginx may not be running. Check: systemctl status nginx"
    fi
}

###############################################################################
# Check 3: Local Connectivity Tests
###############################################################################
check_local_connectivity() {
    log_header "3. Local Connectivity Tests"

    # Test backend directly
    echo "Testing backend (localhost:3000)..."
    if curl -f -s --max-time 5 http://localhost:3000/health > /dev/null 2>&1; then
        log_success "Backend responds on localhost:3000"
        curl -s http://localhost:3000/health | sed 's/^/  /'
    else
        log_error "Backend does NOT respond on localhost:3000"
    fi

    echo ""

    # Test through Nginx
    echo "Testing Nginx (localhost:80)..."
    if curl -f -s --max-time 5 http://localhost/health > /dev/null 2>&1; then
        log_success "Nginx proxies correctly to backend on localhost:80"
        curl -s http://localhost/health | sed 's/^/  /'
    else
        log_error "Nginx does NOT proxy correctly to backend"
        log_info "Check Nginx configuration: /etc/nginx/sites-enabled/hexhaven"
    fi
}

###############################################################################
# Check 4: Instance Firewall (iptables)
###############################################################################
check_instance_firewall() {
    log_header "4. Instance Firewall (iptables)"

    # Check if port 80 is allowed
    if sudo iptables -L INPUT -n -v | grep -q "dpt:80"; then
        log_success "Port 80 is allowed in iptables INPUT chain"
        sudo iptables -L INPUT -n -v | grep "dpt:80" | head -1 | sed 's/^/  /'
    else
        log_error "Port 80 is NOT allowed in iptables"
        log_warn "Run: sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT"
        log_warn "Then save: sudo netfilter-persistent save"
    fi

    echo ""
    log_info "Full iptables INPUT chain:"
    sudo iptables -L INPUT -n --line-numbers | sed 's/^/  /'
}

###############################################################################
# Check 5: Public IP Connectivity
###############################################################################
check_public_connectivity() {
    log_header "5. Public IP Connectivity Test"

    echo "Testing public IP access (${SERVER_IP}:80)..."

    # Try to connect to public IP from the server itself
    if timeout 5 curl -f -s http://${SERVER_IP}/health > /dev/null 2>&1; then
        log_success "Server is accessible from public IP: http://${SERVER_IP}"
    else
        log_error "Server is NOT accessible from public IP: http://${SERVER_IP}"
        echo ""
        log_warn "This indicates the Oracle Cloud Security List is blocking traffic"
        echo ""
        log_info "To fix this, configure the OCI Security List:"
        log_info "1. Go to: https://cloud.oracle.com"
        log_info "2. Navigate to: Networking → Virtual Cloud Networks"
        log_info "3. Select your VCN → Security Lists → Default Security List"
        log_info "4. Click 'Add Ingress Rules'"
        log_info "5. Configure:"
        log_info "   - Source Type: CIDR"
        log_info "   - Source CIDR: 0.0.0.0/0"
        log_info "   - IP Protocol: TCP"
        log_info "   - Destination Port Range: 80"
        log_info "   - Description: HTTP access for Hexhaven"
        log_info "6. Click 'Add Ingress Rules'"
        echo ""
        log_info "After adding the rule, test again: curl http://${SERVER_IP}/health"
    fi
}

###############################################################################
# Check 6: Service Status
###############################################################################
check_service_status() {
    log_header "6. Service Status"

    # Check Nginx
    echo "Nginx status:"
    if systemctl is-active nginx > /dev/null 2>&1; then
        log_success "Nginx is running"
    else
        log_error "Nginx is NOT running"
        log_info "Start it: sudo systemctl start nginx"
    fi

    echo ""

    # Check PM2
    echo "PM2 backend status:"
    if pm2 show hexhaven-backend > /dev/null 2>&1; then
        log_success "Backend is running in PM2"
        pm2 show hexhaven-backend | grep -E "status|restarts|uptime" | sed 's/^/  /'
    else
        log_error "Backend is NOT running in PM2"
        log_info "Start it: cd /opt/hexhaven && pm2 start ecosystem.config.js --env production"
    fi
}

###############################################################################
# Check 7: Configuration Files
###############################################################################
check_configuration() {
    log_header "7. Configuration Files"

    # Check .env file
    if [ -f /opt/hexhaven/.env ]; then
        log_success ".env file exists"
        log_info "Environment variables (non-secret):"
        grep -E "^(NODE_ENV|PORT|HOST|CORS_ORIGIN|LOG_LEVEL)=" /opt/hexhaven/.env | sed 's/^/  /' || log_info "  (all variables contain secrets)"
    else
        log_error ".env file is missing"
    fi

    echo ""

    # Check Nginx configuration
    if [ -f /etc/nginx/sites-enabled/hexhaven ]; then
        log_success "Nginx site configuration exists"
        log_info "Listen directives:"
        sudo grep -E "^\s*listen" /etc/nginx/sites-enabled/hexhaven | sed 's/^/  /'
        echo ""
        log_info "Server name:"
        sudo grep -E "^\s*server_name" /etc/nginx/sites-enabled/hexhaven | sed 's/^/  /'
    else
        log_error "Nginx site configuration is missing"
    fi

    echo ""

    # Test Nginx configuration
    echo "Nginx configuration test:"
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration has errors"
        sudo nginx -t 2>&1 | sed 's/^/  /'
    fi
}

###############################################################################
# Check 8: Recent Logs
###############################################################################
check_logs() {
    log_header "8. Recent Logs"

    # PM2 logs
    echo "PM2 backend logs (last 20 lines):"
    if pm2 logs hexhaven-backend --lines 20 --nostream 2>/dev/null; then
        log_success "Backend logs retrieved"
    else
        log_warn "Could not retrieve PM2 logs"
        if [ -f /opt/hexhaven/logs/pm2-error.log ]; then
            echo "File-based logs:"
            tail -20 /opt/hexhaven/logs/pm2-error.log | sed 's/^/  /'
        fi
    fi

    echo ""

    # Nginx error log
    echo "Nginx error log (last 10 lines):"
    if [ -f /var/log/nginx/error.log ]; then
        sudo tail -10 /var/log/nginx/error.log | sed 's/^/  /'
    else
        log_warn "Nginx error log not found"
    fi
}

###############################################################################
# Generate Summary Report
###############################################################################
generate_summary() {
    log_header "SUMMARY"

    echo ""
    echo "Quick Fix Commands:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "If backend is not running:"
    echo "  cd /opt/hexhaven && pm2 start ecosystem.config.js --env production"
    echo ""
    echo "If Nginx is not running:"
    echo "  sudo systemctl start nginx"
    echo ""
    echo "If port 80 is blocked in iptables:"
    echo "  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT"
    echo "  sudo netfilter-persistent save"
    echo ""
    echo "If public IP is not accessible (OCI Security List issue):"
    echo "  Configure OCI Security List to allow port 80 ingress from 0.0.0.0/0"
    echo "  See: https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm"
    echo ""
    echo "View backend logs:"
    echo "  pm2 logs hexhaven-backend"
    echo ""
    echo "View Nginx logs:"
    echo "  sudo tail -f /var/log/nginx/error.log"
    echo ""
    echo "Restart services:"
    echo "  pm2 restart hexhaven-backend"
    echo "  sudo systemctl restart nginx"
    echo ""
}

###############################################################################
# Main Execution
###############################################################################
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Hexhaven Network Diagnostics                      ║${NC}"
    echo -e "${BLUE}║     Oracle Cloud Infrastructure Edition               ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

    check_server_ip
    check_listening_ports
    check_local_connectivity
    check_instance_firewall
    check_public_connectivity
    check_service_status
    check_configuration
    check_logs
    generate_summary

    echo ""
    echo -e "${GREEN}Diagnostics complete!${NC}"
    echo ""
}

# Run diagnostics
main "$@"

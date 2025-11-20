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
# Check 1: Detect Server IP and Network Configuration
###############################################################################
check_server_ip() {
    log_header "1. Server IP Detection"

    # Get primary private IP
    PRIMARY_IP=$(ip -4 addr show | grep inet | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d/ -f1 || echo "")

    if [ -n "$PRIMARY_IP" ]; then
        log_success "Private IP detected: $PRIMARY_IP"
    else
        log_error "Could not detect primary IP address"
        return 1
    fi

    echo ""
    log_info "Checking Oracle Cloud instance metadata..."

    # Get instance metadata using Oracle Cloud IMDS v2
    METADATA=$(curl -s -H "Authorization: Bearer Oracle" -L http://169.254.169.254/opc/v2/instance/ 2>/dev/null)

    if [ -n "$METADATA" ]; then
        log_success "Successfully retrieved OCI instance metadata"

        # Extract public IP
        PUBLIC_IP=$(echo "$METADATA" | grep -o '"publicIp":"[^"]*"' | cut -d'"' -f4 || echo "")

        # Extract instance details
        INSTANCE_NAME=$(echo "$METADATA" | grep -o '"displayName":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        REGION=$(echo "$METADATA" | grep -o '"region":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

        log_info "Instance Name: $INSTANCE_NAME"
        log_info "Region: $REGION"

        if [ -n "$PUBLIC_IP" ]; then
            log_success "Public IP assigned: $PUBLIC_IP"
            export SERVER_IP="$PUBLIC_IP"
        else
            log_error "No public IP assigned to this instance!"
            log_warn "This instance only has a private IP: $PRIMARY_IP"
            log_warn "You need to assign a public IP or use a NAT Gateway"
            log_info "To assign a public IP:"
            log_info "1. Go to OCI Console → Compute → Instances"
            log_info "2. Click your instance → Attached VNICs"
            log_info "3. Click your VNIC → IPv4 Addresses"
            log_info "4. Click 'Reserved Public IP' or 'Ephemeral Public IP'"
            export SERVER_IP="$PRIMARY_IP"
            return 1
        fi
    else
        log_warn "Could not retrieve OCI metadata (not an Oracle Cloud instance?)"
        log_info "Using detected IP: $PRIMARY_IP"
        export SERVER_IP="$PRIMARY_IP"
    fi
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
# Check 4: Instance Firewall (iptables) - DETAILED
###############################################################################
check_instance_firewall() {
    log_header "4. Instance Firewall (iptables) - Detailed Analysis"

    # Check for port 80 ACCEPT rule
    echo "Checking for port 80 ACCEPT rules..."
    ACCEPT_RULE=$(sudo iptables -L INPUT -n -v --line-numbers | grep "dpt:80" | grep "ACCEPT")

    if [ -n "$ACCEPT_RULE" ]; then
        log_success "Port 80 ACCEPT rule found:"
        echo "$ACCEPT_RULE" | sed 's/^/  /'
        ACCEPT_LINE=$(echo "$ACCEPT_RULE" | awk '{print $1}')
        log_info "Rule position: line $ACCEPT_LINE"
    else
        log_error "No ACCEPT rule for port 80 found"
        log_warn "Add rule: sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT"
    fi

    echo ""

    # Check for DROP/REJECT rules that might come BEFORE the ACCEPT rule
    echo "Checking for DROP/REJECT rules that might block port 80..."
    DROP_RULES=$(sudo iptables -L INPUT -n -v --line-numbers | grep -E "DROP|REJECT" | head -10)

    if [ -n "$DROP_RULES" ]; then
        log_warn "Found DROP/REJECT rules in INPUT chain:"
        echo "$DROP_RULES" | sed 's/^/  /'

        # Check if there's a DROP/REJECT before our ACCEPT
        if [ -n "$ACCEPT_LINE" ]; then
            BLOCKING_RULES=$(sudo iptables -L INPUT -n --line-numbers | head -n $ACCEPT_LINE | grep -E "DROP|REJECT" | grep -v "invalid\|RELATED")
            if [ -n "$BLOCKING_RULES" ]; then
                log_error "Found DROP/REJECT rules BEFORE the port 80 ACCEPT rule!"
                echo "$BLOCKING_RULES" | sed 's/^/  /'
                log_warn "These rules may be blocking traffic before it reaches the ACCEPT rule"
                log_warn "Consider reordering rules or adding a more specific ACCEPT rule earlier"
            fi
        fi
    else
        log_info "No DROP/REJECT rules found in INPUT chain"
    fi

    echo ""
    log_info "Full iptables INPUT chain (first 15 rules):"
    sudo iptables -L INPUT -n -v --line-numbers | head -20 | sed 's/^/  /'

    echo ""
    log_info "iptables policy for INPUT chain:"
    POLICY=$(sudo iptables -L INPUT | head -1 | grep -o "policy [A-Z]*" || echo "unknown")
    if echo "$POLICY" | grep -q "DROP\|REJECT"; then
        log_warn "Default policy is DROP/REJECT - ACCEPT rules must come before DROP"
        echo "  $POLICY"
    else
        log_success "Default policy: $POLICY"
    fi
}

###############################################################################
# Check 5: Oracle Cloud Network Security Groups (NSGs)
###############################################################################
check_network_security_groups() {
    log_header "5. Network Security Groups (NSGs) Check"

    log_info "Checking if this VNIC has Network Security Groups attached..."
    echo ""

    # Try to get VNIC info from metadata
    VNIC_DATA=$(curl -s -H "Authorization: Bearer Oracle" -L http://169.254.169.254/opc/v2/vnics/ 2>/dev/null)

    if [ -n "$VNIC_DATA" ]; then
        # Check if NSGs are mentioned (this is a simplified check)
        if echo "$VNIC_DATA" | grep -q "nsgIds"; then
            log_warn "Network Security Groups (NSGs) may be attached to this instance"
            log_info "NSGs can block traffic even if Security Lists allow it"
            echo ""
            log_info "To check NSGs:"
            log_info "1. Go to OCI Console → Compute → Instances"
            log_info "2. Click your instance → Attached VNICs"
            log_info "3. Click your VNIC → Network Security Groups"
            log_info "4. If NSGs are attached, check their rules"
            log_info "5. Add ingress rule for TCP port 80 from 0.0.0.0/0"
            echo ""
            log_warn "NSGs take precedence over Security Lists!"
        else
            log_success "No Network Security Groups detected"
            log_info "Using Security Lists only (expected configuration)"
        fi
    else
        log_warn "Could not retrieve VNIC metadata"
        log_info "Cannot determine if NSGs are attached"
        log_info "Manually check in OCI Console: Instance → Attached VNICs → NSGs"
    fi
}

###############################################################################
# Check 6: Public IP Connectivity
###############################################################################
check_public_connectivity() {
    log_header "6. Public IP Connectivity Test"

    echo "Testing public IP access (${SERVER_IP}:80)..."

    # Try to connect to public IP from the server itself
    if timeout 5 curl -f -s http://${SERVER_IP}/health > /dev/null 2>&1; then
        log_success "Server is accessible from public IP: http://${SERVER_IP}"
    else
        log_error "Server is NOT accessible from public IP: http://${SERVER_IP}"
        echo ""
        log_warn "Possible causes (in order of likelihood):"
        echo ""
        log_info "1. Network Security Groups (NSGs) blocking port 80"
        log_info "   → Check: OCI Console → Instance → Attached VNICs → NSGs"
        log_info "   → Add ingress rule for TCP port 80 from 0.0.0.0/0"
        echo ""
        log_info "2. Security List not configured correctly"
        log_info "   → Check: OCI Console → Networking → VCN → Security Lists"
        log_info "   → Verify ingress rule exists for TCP port 80 from 0.0.0.0/0"
        echo ""
        log_info "3. iptables blocking (check section 4 above)"
        log_info "   → Verify ACCEPT rule comes before any DROP rules"
        echo ""
        log_info "4. Subnet routing issue"
        log_info "   → Check: OCI Console → Networking → VCN → Route Tables"
        log_info "   → Verify route to 0.0.0.0/0 via Internet Gateway exists"
        echo ""
        log_info "5. No public IP assigned (check section 1 above)"
        log_info "   → Assign public IP to instance VNIC"
    fi
}

###############################################################################
# Check 7: Service Status
###############################################################################
check_service_status() {
    log_header "7. Service Status"

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
# Check 8: Configuration Files
###############################################################################
check_configuration() {
    log_header "8. Configuration Files"

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
# Check 9: Recent Logs
###############################################################################
check_logs() {
    log_header "9. Recent Logs"

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
    check_network_security_groups
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

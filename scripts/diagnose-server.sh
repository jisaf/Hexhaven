#!/bin/bash

###############################################################################
# Server Diagnostics Script
###############################################################################
# Run this on the production server to diagnose connectivity issues
###############################################################################

echo "=== Hexhaven Server Diagnostics ==="
echo ""

# Check if Nginx is installed
echo "1. Nginx Status:"
if command -v nginx &> /dev/null; then
    echo "   ✓ Nginx installed: $(nginx -v 2>&1)"
    if systemctl is-active --quiet nginx; then
        echo "   ✓ Nginx is running"
    else
        echo "   ✗ Nginx is NOT running"
        echo "   Fix: sudo systemctl start nginx"
    fi
else
    echo "   ✗ Nginx is NOT installed"
    echo "   Fix: sudo apt-get update && sudo apt-get install -y nginx"
fi
echo ""

# Check if PM2 backend is running
echo "2. Backend Status:"
if command -v pm2 &> /dev/null; then
    echo "   ✓ PM2 installed: $(pm2 --version)"
    if pm2 show hexhaven-backend > /dev/null 2>&1; then
        echo "   ✓ Backend is running under PM2"
        pm2 show hexhaven-backend | grep -E "status|uptime|restarts"
    else
        echo "   ✗ Backend is NOT running under PM2"
        echo "   Fix: cd /opt/hexhaven && pm2 start backend/dist/backend/src/main.js --name hexhaven-backend"
    fi
else
    echo "   ✗ PM2 is NOT installed"
fi
echo ""

# Check if backend is listening on port 3000
echo "3. Backend Port:"
if ss -tuln | grep -q ":3000"; then
    echo "   ✓ Backend is listening on port 3000"
else
    echo "   ✗ Backend is NOT listening on port 3000"
fi
echo ""

# Check IP addresses
echo "4. Network Interfaces:"
ip -4 addr show | grep inet | grep -v 127.0.0.1
echo ""

# Check firewall status (iptables)
echo "5. Firewall Rules (iptables):"
if sudo iptables -L -n | grep -q "policy DROP"; then
    echo "   ⚠ Default policy is DROP - may need to open ports"
fi
if sudo iptables -L -n | grep -q "dpt:80"; then
    echo "   ✓ Port 80 rule found"
else
    echo "   ✗ No explicit rule for port 80"
    echo "   Fix: sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT"
fi
if sudo iptables -L -n | grep -q "dpt:443"; then
    echo "   ✓ Port 443 rule found"
else
    echo "   ✗ No explicit rule for port 443"
fi
echo ""

# Check Nginx configuration
echo "6. Nginx Configuration:"
if [ -f /etc/nginx/sites-enabled/hexhaven ]; then
    echo "   ✓ Hexhaven site config exists"
else
    echo "   ✗ Hexhaven site config NOT found"
    echo "   Expected: /etc/nginx/sites-enabled/hexhaven"
fi

if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "   ⚠ Default site config still active (may conflict)"
fi
echo ""

# Check frontend files
echo "7. Frontend Files:"
if [ -d /var/www/hexhaven/frontend ]; then
    echo "   ✓ Frontend directory exists"
    if [ -f /var/www/hexhaven/frontend/index.html ]; then
        echo "   ✓ index.html found"
    else
        echo "   ✗ index.html NOT found"
    fi
else
    echo "   ✗ Frontend directory NOT found at /var/www/hexhaven/frontend"
fi
echo ""

# Test local connectivity
echo "8. Local HTTP Test:"
if command -v curl &> /dev/null; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|301\|302"; then
        echo "   ✓ Nginx responding locally"
    else
        echo "   ✗ Nginx NOT responding on localhost"
    fi
else
    echo "   ⚠ curl not installed"
fi
echo ""

echo "=== Summary ==="
echo "Run 'sudo iptables -L -n' to see all firewall rules"
echo "Run 'sudo nginx -t' to test Nginx configuration"
echo "Run 'pm2 logs hexhaven-backend' to see backend logs"
echo "Run 'sudo tail -f /var/log/nginx/error.log' to see Nginx errors"
echo ""

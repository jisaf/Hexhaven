# Fix: Production Server Not Accessible from Public Internet

## Problem

Your Hexhaven deployment on Oracle Cloud is running successfully, but **not accessible from the public internet**.

**Symptoms:**
- ✅ Backend running on localhost:3000
- ✅ Nginx running on port 80
- ✅ `curl localhost/health` works on the server
- ❌ `curl http://YOUR_IP/health` times out from your computer

## Root Cause

**Oracle Cloud Security List is blocking inbound traffic on port 80.**

Oracle Cloud uses TWO layers of firewall:
1. **Instance firewall (iptables)** - ✅ Configured automatically
2. **Network Security List** - ❌ **Not configured** ← This is the problem

## Quick Fix (5 minutes)

### Step 1: Access OCI Console

1. Go to https://cloud.oracle.com
2. Sign in to your Oracle Cloud account

### Step 2: Navigate to Security Lists

1. Click **☰ menu** (top-left)
2. Go to **Networking** → **Virtual Cloud Networks**
3. Click on your VCN
4. Click **Security Lists** (left sidebar)
5. Click **Default Security List for [Your VCN]**

### Step 3: Add HTTP Ingress Rule

1. Click **Add Ingress Rules**
2. Fill in:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `80`
   - **Description**: `HTTP access for Hexhaven`
3. Click **Add Ingress Rules**

### Step 4: Verify

```bash
# From your local computer
curl http://YOUR_SERVER_IP/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-17T...","version":"1.0.0"}
```

## Still Not Working?

### Run Network Diagnostics

SSH into your server and run the diagnostics script:

```bash
ssh ubuntu@YOUR_SERVER_IP
cd /opt/hexhaven
./scripts/network-diagnostics.sh
```

The script will check:
- ✓ Server IP detection
- ✓ Port listening status (3000, 80)
- ✓ Local connectivity (backend, Nginx)
- ✓ Instance firewall (iptables)
- ✓ Public IP connectivity
- ✓ Service status (Nginx, PM2)
- ✓ Configuration files
- ✓ Recent logs

### Common Issues

| Issue | Solution |
|-------|----------|
| Backend not running | `cd /opt/hexhaven && pm2 start ecosystem.config.js --env production` |
| Nginx not running | `sudo systemctl start nginx` |
| Port 80 blocked in iptables | `sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT && sudo netfilter-persistent save` |
| Security List not configured | Follow Quick Fix above |

## Detailed Documentation

For comprehensive documentation, see:

- **[OCI Network Setup Guide](OCI_NETWORK_SETUP.md)** - Complete guide with screenshots and advanced options
- **Network Diagnostics Script** - `/opt/hexhaven/scripts/network-diagnostics.sh`
- **Deployment Logs** - Check GitHub Actions workflow output

## Why This Happens

This is a **one-time setup requirement** for Oracle Cloud deployments.

Unlike AWS or other cloud providers that allow all traffic by default (then you lock it down), Oracle Cloud **blocks all traffic by default** (then you open it up).

The Security List configuration:
- ✅ Only needs to be done **once per VCN**
- ✅ Persists across deployments
- ✅ Takes effect immediately (no restart needed)
- ✅ Can be automated with OCI CLI or Terraform

## Security Notes

### Production Recommendations

For production deployments, consider:

1. **Use HTTPS** - Add SSL/TLS certificate (Let's Encrypt)
   - Requires port 443 ingress rule
   - Update Nginx configuration

2. **Restrict Source IPs** - Instead of `0.0.0.0/0`, use specific CIDR blocks
   - Your office IP range
   - Your VPN exit IPs
   - CloudFlare IPs (if using CF proxy)

3. **Enable WAF** - Oracle Cloud Web Application Firewall
   - Protects against common attacks
   - Provides rate limiting
   - Bot management

### Example: Restrict to Office IP

If your office has a static IP `203.0.113.45`:

1. Use Source CIDR: `203.0.113.45/32` (single IP)
2. Or for a range: `203.0.113.0/24` (entire subnet)

## Automation (Advanced)

### Using OCI CLI

```bash
# Install OCI CLI
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Configure authentication
oci setup config

# Add HTTP ingress rule
oci network security-list update \
  --security-list-id ocid1.securitylist.oc1... \
  --ingress-security-rules '[{
    "protocol": "6",
    "source": "0.0.0.0/0",
    "tcpOptions": {
      "destinationPortRange": {"min": 80, "max": 80}
    },
    "description": "HTTP access"
  }]' \
  --force
```

### Using Terraform

See [OCI_NETWORK_SETUP.md](OCI_NETWORK_SETUP.md#option-3-terraform-infrastructure-as-code) for Terraform configuration.

## Summary

✅ **The Fix**: Configure OCI Security List to allow port 80 ingress
⏱️ **Time Required**: 5 minutes
🔄 **Frequency**: One-time setup per VCN
📚 **Documentation**: [OCI_NETWORK_SETUP.md](OCI_NETWORK_SETUP.md)
🔧 **Diagnostics**: `/opt/hexhaven/scripts/network-diagnostics.sh`

After configuring the Security List, your Hexhaven deployment will be accessible from anywhere on the internet at:

🌐 **http://YOUR_SERVER_IP/**

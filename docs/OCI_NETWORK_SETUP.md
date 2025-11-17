# Oracle Cloud Infrastructure Network Setup for Hexhaven

This guide explains how to configure Oracle Cloud Infrastructure (OCI) networking to allow public access to your Hexhaven deployment.

## The Problem

When deploying to Oracle Cloud, your application may not be accessible from the public internet even though:
- ✅ Backend is running on localhost:3000
- ✅ Nginx is running on port 80
- ✅ Instance firewall (iptables) allows port 80
- ✅ Local connectivity works (`curl localhost/health` succeeds)
- ❌ **Public access fails** (`curl http://YOUR_IP/health` times out)

## Why This Happens

Oracle Cloud Infrastructure uses **two layers of firewall protection**:

1. **Instance-level firewall (iptables)** - Configured automatically by deployment script ✅
2. **Network-level Security List** - Requires manual configuration in OCI Console ❌

The Security List is a virtual firewall for your Virtual Cloud Network (VCN). By default, it blocks all inbound traffic except SSH (port 22).

## Solution: Configure OCI Security List

### Option 1: Web Console (Recommended for First-Time Setup)

#### Step 1: Access OCI Console

1. Go to https://cloud.oracle.com
2. Sign in to your Oracle Cloud account
3. Navigate to your region (check the top-right corner)

#### Step 2: Find Your VCN

1. Click the **☰ menu** (hamburger icon) in the top-left
2. Go to **Networking** → **Virtual Cloud Networks**
3. Select your VCN (usually named similar to your instance)

#### Step 3: Configure Security List

1. In the VCN details page, click **Security Lists** in the left sidebar
2. Click on **Default Security List for [Your VCN Name]**
3. Click **Add Ingress Rules** button

#### Step 4: Add HTTP Ingress Rule

Configure the rule with these values:

| Field | Value |
|-------|-------|
| **Stateless** | ☐ Unchecked (leave default) |
| **Source Type** | CIDR |
| **Source CIDR** | `0.0.0.0/0` |
| **IP Protocol** | TCP |
| **Source Port Range** | (leave empty) |
| **Destination Port Range** | `80` |
| **Description** | HTTP access for Hexhaven |

5. Click **Add Ingress Rules**

#### Step 5: (Optional) Add HTTPS Rule

If you plan to use HTTPS in the future:

1. Click **Add Ingress Rules** again
2. Use the same settings as above, but:
   - **Destination Port Range**: `443`
   - **Description**: HTTPS access for Hexhaven
3. Click **Add Ingress Rules**

### Option 2: OCI CLI (Advanced)

If you have the OCI CLI installed and configured:

```bash
# Get your Security List OCID
SECURITY_LIST_OCID=$(oci network security-list list \
  --compartment-id <YOUR_COMPARTMENT_OCID> \
  --vcn-id <YOUR_VCN_OCID> \
  --query 'data[0].id' \
  --raw-output)

# Add HTTP ingress rule
oci network security-list update \
  --security-list-id $SECURITY_LIST_OCID \
  --ingress-security-rules '[
    {
      "protocol": "6",
      "source": "0.0.0.0/0",
      "tcpOptions": {
        "destinationPortRange": {
          "min": 80,
          "max": 80
        }
      },
      "description": "HTTP access for Hexhaven"
    }
  ]' \
  --force
```

### Option 3: Terraform (Infrastructure as Code)

Add this to your Terraform configuration:

```hcl
resource "oci_core_security_list" "hexhaven_security_list" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.hexhaven_vcn.id
  display_name   = "Hexhaven Security List"

  # Allow SSH (typically already present)
  ingress_security_rules {
    protocol    = "6" # TCP
    source      = "0.0.0.0/0"
    description = "SSH access"

    tcp_options {
      min = 22
      max = 22
    }
  }

  # Allow HTTP
  ingress_security_rules {
    protocol    = "6" # TCP
    source      = "0.0.0.0/0"
    description = "HTTP access for Hexhaven"

    tcp_options {
      min = 80
      max = 80
    }
  }

  # Allow HTTPS (optional)
  ingress_security_rules {
    protocol    = "6" # TCP
    source      = "0.0.0.0/0"
    description = "HTTPS access for Hexhaven"

    tcp_options {
      min = 443
      max = 443
    }
  }
}
```

## Verification

After configuring the Security List, verify access:

### From Your Local Machine

```bash
# Test health endpoint
curl http://YOUR_SERVER_IP/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-17T...","version":"1.0.0"}

# Test frontend
curl -I http://YOUR_SERVER_IP/

# Expected: HTTP/1.1 200 OK
```

### From the Server

SSH into your server and run the network diagnostics script:

```bash
ssh ubuntu@YOUR_SERVER_IP
cd /opt/hexhaven
chmod +x scripts/network-diagnostics.sh
./scripts/network-diagnostics.sh
```

## Troubleshooting

### "Connection timed out" when accessing from public IP

**Symptoms:**
```bash
$ curl http://YOUR_SERVER_IP/health
curl: (7) Failed to connect to YOUR_SERVER_IP port 80: Connection timed out
```

**Cause:** Security List is still blocking port 80

**Solution:**
1. Double-check that you added the ingress rule correctly
2. Verify the rule appears in the Security List's Ingress Rules table
3. Make sure you selected the correct VCN and Security List
4. Rules take effect immediately, no restart needed

### "Connection refused" when accessing from public IP

**Symptoms:**
```bash
$ curl http://YOUR_SERVER_IP/health
curl: (7) Failed to connect to YOUR_SERVER_IP port 80: Connection refused
```

**Cause:** Nginx or backend is not running, or iptables is blocking

**Solution:**
1. Run the network diagnostics script on the server
2. Check service status: `systemctl status nginx` and `pm2 status`
3. Check iptables: `sudo iptables -L INPUT -n | grep 80`

### Works locally but not from public IP

**Symptoms:**
- `curl localhost/health` works on the server ✅
- `curl YOUR_SERVER_IP/health` fails from your computer ❌

**Cause:** Security List ingress rule not configured

**Solution:** Follow the steps above to add the HTTP ingress rule

## Security Considerations

### Limiting Access by Source IP

If you want to restrict access to specific IP addresses instead of the entire internet:

1. Instead of `0.0.0.0/0`, use your specific CIDR:
   - Single IP: `203.0.113.1/32`
   - IP range: `203.0.113.0/24`
   - Multiple IPs: Add multiple ingress rules

2. Example for office-only access:
   - Source CIDR: `198.51.100.0/24` (your office network)
   - This blocks access from all other IPs

### Rate Limiting

Oracle Cloud Security Lists don't support rate limiting. For DDoS protection, consider:

1. **OCI Web Application Firewall (WAF)**
   - Protects against common web attacks
   - Provides rate limiting and bot management
   - Requires separate configuration

2. **Application-level rate limiting**
   - Use Nginx rate limiting
   - Implement in your application code

## Additional Resources

- [OCI Security Lists Documentation](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm)
- [OCI Network Security Overview](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/overview.htm)
- [OCI CLI Reference](https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/)

## Quick Reference

| Task | Command |
|------|---------|
| Run diagnostics | `cd /opt/hexhaven && ./scripts/network-diagnostics.sh` |
| Check Nginx | `systemctl status nginx` |
| Check backend | `pm2 status` |
| View backend logs | `pm2 logs hexhaven-backend` |
| View Nginx logs | `sudo tail -f /var/log/nginx/error.log` |
| Test from server | `curl localhost/health` |
| Check iptables | `sudo iptables -L INPUT -n` |
| Restart Nginx | `sudo systemctl restart nginx` |
| Restart backend | `pm2 restart hexhaven-backend` |

## Summary

To make your Hexhaven deployment accessible from the public internet on Oracle Cloud:

1. ✅ **Deploy your application** (automated by GitHub Actions)
2. ✅ **Instance firewall configured** (automated by deployment script)
3. ⚠️  **Configure OCI Security List** (manual, one-time setup) ← **YOU NEED TO DO THIS**
4. ✅ **Verify connectivity** (using diagnostics script)

The Security List configuration is a **one-time setup** per VCN. Once configured, all future deployments will work without additional network configuration.

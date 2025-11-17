# Network Troubleshooting: When Security Lists Are Already Configured

## Symptom

Your Oracle Cloud deployment shows:
- ✅ Backend running on localhost:3000
- ✅ Nginx running on port 80
- ✅ `curl localhost/health` works on server
- ✅ Security List has port 80 ingress rule configured
- ❌ `curl http://PUBLIC_IP/health` times out

## Most Likely Causes

### 1. Network Security Groups (NSGs) Blocking Traffic ⚠️ MOST COMMON

Oracle Cloud has **TWO** separate firewall systems:
- **Security Lists** (you already configured this ✓)
- **Network Security Groups (NSGs)** ← Check this!

**NSGs override Security Lists!** Even if your Security List allows port 80, NSGs can block it.

#### How to Check and Fix:

1. Go to OCI Console: https://cloud.oracle.com
2. Navigate to **Compute** → **Instances**
3. Click on your instance
4. Click **Attached VNICs** in the left sidebar
5. Click on your VNIC (usually "Primary VNIC")
6. Look for **Network Security Groups** section

**If NSGs are attached:**
1. Click on each NSG
2. Check **Ingress Security Rules**
3. Add a rule if missing:
   - **Source Type**: CIDR
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: TCP
   - **Destination Port**: `80`
   - **Description**: HTTP access

**If no NSGs attached:** This is not the issue, continue to #2

---

### 2. iptables Rules in Wrong Order

The `iptables` firewall processes rules **in order**. A DROP rule before an ACCEPT rule will block traffic.

#### How to Check:

SSH into your server and run:
```bash
cd /opt/hexhaven
./scripts/network-diagnostics.sh
```

Look at **Section 4: Instance Firewall**. It will show if DROP rules come before ACCEPT rules.

#### How to Fix:

If the ACCEPT rule is after DROP rules, reorder them:

```bash
# Remove the existing port 80 rule
sudo iptables -D INPUT <line_number>

# Add it at position 1 (before any DROP rules)
sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT

# Save the changes
sudo netfilter-persistent save
```

---

### 3. Instance Has No Public IP

Your instance might only have a private IP address.

#### How to Check:

Run the diagnostics:
```bash
cd /opt/hexhaven
./scripts/network-diagnostics.sh
```

Look at **Section 1: Server IP Detection**. If it shows:
```
✗ No public IP assigned to this instance!
```

#### How to Fix:

**Option A: Assign Ephemeral Public IP**
1. Go to OCI Console → Compute → Instances
2. Click your instance → Attached VNICs
3. Click your VNIC → IPv4 Addresses
4. Click **Assign Public IP**
5. Select **Ephemeral Public IP** (free, but changes on restart)
6. Click **Assign**

**Option B: Reserve Public IP (Recommended for Production)**
1. Go to OCI Console → Networking → IP Management → **Reserved Public IPs**
2. Click **Reserve Public IP Address**
3. Choose your compartment
4. Click **Reserve**
5. Go back to Instance → Attached VNICs → IPv4 Addresses
6. Click **Assign Public IP**
7. Select **Reserved Public IP**
8. Choose the IP you just reserved
9. Click **Assign**

---

### 4. Subnet Routing Issue

Your subnet might not have a route to the Internet Gateway.

#### How to Check:

1. Go to OCI Console → Networking → Virtual Cloud Networks
2. Click your VCN
3. Click **Subnets** in the left sidebar
4. Click on the subnet your instance is in
5. Click on the **Route Table** link

**Check for this route:**
- **Destination CIDR**: `0.0.0.0/0`
- **Target Type**: Internet Gateway
- **Target**: (your Internet Gateway)

#### How to Fix:

If the route is missing:

1. In the Route Table, click **Add Route Rules**
2. Configure:
   - **Target Type**: Internet Gateway
   - **Destination CIDR Block**: `0.0.0.0/0`
   - **Compartment**: (select your compartment)
   - **Target Internet Gateway**: (select your IGW)
3. Click **Add Route Rules**

**If no Internet Gateway exists:**

1. Go to VCN → Internet Gateways
2. Click **Create Internet Gateway**
3. Enter name (e.g., "hexhaven-igw")
4. Click **Create**
5. Then add the route as described above

---

### 5. Subnet is Private

Your instance might be in a private subnet (no direct internet access).

#### How to Check:

1. Go to OCI Console → Networking → VCN
2. Click your VCN → Subnets
3. Click your subnet
4. Check **Subnet Access**: Should be **Public Subnet**

If it shows **Private Subnet**, you have two options:

#### Option A: Move to Public Subnet (Recommended)

1. Create a new instance in a public subnet
2. Or change subnet routing (advanced)

#### Option B: Use Load Balancer

1. Keep instance in private subnet
2. Create a public Load Balancer
3. Configure it to forward traffic to your instance

---

## Running Comprehensive Diagnostics

SSH into your server and run:

```bash
cd /opt/hexhaven
./scripts/network-diagnostics.sh
```

This script checks:
1. Public IP assignment
2. Port listening status
3. Local connectivity
4. iptables rules (in detail)
5. **Network Security Groups** ← New!
6. Public connectivity
7. Service status
8. Configuration files
9. Recent logs

The script will pinpoint exactly what's blocking access.

---

## Quick Diagnostic Commands

### From Your Local Computer:

```bash
# Test if port 80 is reachable
nc -zv YOUR_IP 80

# If it times out: firewall issue (NSG, Security List, or iptables)
# If it connects: application issue (Nginx/backend)

# Test with curl (more detailed)
curl -v --max-time 10 http://YOUR_IP/health
```

### From the Server:

```bash
# Test backend directly
curl http://localhost:3000/health

# Test through Nginx locally
curl http://localhost/health

# Test from public IP (requires public IP loopback)
curl http://$(curl -s ifconfig.me)/health

# Check what's listening on port 80
sudo ss -tlnp | grep :80

# Check iptables in detail
sudo iptables -L INPUT -n -v --line-numbers

# Check for NSG info in metadata
curl -H "Authorization: Bearer Oracle" http://169.254.169.254/opc/v2/vnics/
```

---

## Summary Checklist

Work through these in order:

- [ ] **Check NSGs** - Instance → VNICs → Network Security Groups
  - If attached, add port 80 ingress rule to each NSG
- [ ] **Check Public IP** - Instance → VNICs → IPv4 Addresses
  - Must have a public IP assigned
- [ ] **Check iptables** - Run diagnostics script, check rule order
  - ACCEPT must come before DROP
- [ ] **Check Route Table** - VCN → Subnets → Route Tables
  - Must have route to 0.0.0.0/0 via Internet Gateway
- [ ] **Check Security List** - VCN → Security Lists
  - Must have port 80 ingress from 0.0.0.0/0 (you already have this ✓)
- [ ] **Check Subnet Type** - Must be Public Subnet
- [ ] **Check Services** - Nginx and backend must be running
  - `systemctl status nginx`
  - `pm2 status`

---

## Still Not Working?

### Get Help:

1. **Run full diagnostics** and save output:
   ```bash
   cd /opt/hexhaven
   ./scripts/network-diagnostics.sh > /tmp/network-diag.txt 2>&1
   cat /tmp/network-diag.txt
   ```

2. **Collect additional info:**
   ```bash
   # Instance metadata
   curl -H "Authorization: Bearer Oracle" http://169.254.169.254/opc/v2/instance/ | jq .

   # VNIC info
   curl -H "Authorization: Bearer Oracle" http://169.254.169.254/opc/v2/vnics/ | jq .

   # Network interfaces
   ip addr show

   # Routing table
   ip route show
   ```

3. **Share these outputs** with your cloud administrator or support team

---

## Common Oracle Cloud Gotchas

| Issue | Why It Happens | Solution |
|-------|---------------|----------|
| NSGs blocking | NSGs attached to VNIC by default in some configurations | Check VNIC → NSGs, add port 80 rule |
| No public IP | Free tier limits, or private subnet selection | Assign ephemeral or reserved public IP |
| Wrong subnet | Instance created in private subnet | Move to public subnet or add NAT/LB |
| Missing IGW route | Subnet not configured for internet | Add route to 0.0.0.0/0 via IGW |
| iptables ordering | Oracle Linux default rules | Reorder rules, ACCEPT before DROP |

---

## Reference Documentation

- [Oracle Cloud Security Lists](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm)
- [Oracle Cloud Network Security Groups](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/networksecuritygroups.htm)
- [Oracle Cloud Public IPs](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/managingpublicIPs.htm)
- [Oracle Cloud Route Tables](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/managingroutetables.htm)

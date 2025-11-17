# Terraform Configuration Analysis & Production Fix

## Issue Identified

Your Terraform configuration (`main.tf`) manages a **staging environment**, but your production deployment workflow targets a different instance.

### Terraform Configuration
- **Instance Name**: `hexhaven-staging` (line 199)
- **Environment**: `staging` (tags)
- **Network**: Correctly configured with Security List allowing port 80 ✅

### Production Deployment
- **Target IP**: `129.213.88.197` (from `PRODUCTION_HOST` secret)
- **Instance Name**: Unknown (not managed by current Terraform)
- **Network**: Configuration unknown ❌

## Root Cause

The production instance (`129.213.88.197`) was likely:
1. Created manually via OCI Console
2. Created by a different Terraform configuration
3. Has Network Security Groups (NSGs) attached that block port 80
4. Or uses a different Security List without port 80 ingress

**Key Finding**: Your Terraform has NO NSG resources, but Oracle Cloud may have NSGs attached to the production instance.

## Solution Options

### Option 1: Check NSGs on Production Instance (Quickest Fix)

1. **OCI Console** → **Compute** → **Instances**
2. Find the instance with IP `129.213.88.197`
3. Click **Attached VNICs** → Click the primary VNIC
4. Check **Network Security Groups** section

**If NSGs are present:**
- Click each NSG
- Go to **Security Rules**
- Add **Ingress Rule**:
  - Direction: Ingress
  - Source CIDR: `0.0.0.0/0`
  - IP Protocol: TCP
  - Destination Port: `80`

**If NO NSGs** but still blocked:
- Check the instance's subnet's Security List
- Verify it has port 80 ingress rule
- Check if subnet has route to Internet Gateway

### Option 2: Manage Production with Terraform (Recommended)

Create a proper production Terraform configuration:

#### File: `infrastructure/terraform/environments/production/main.tf`

```hcl
# Use the same VCN/networking from staging (or create new)
# Reference the staging module or duplicate with production settings

terraform {
  required_version = ">= 1.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "hexhaven-terraform-state"
    key    = "production/terraform.tfstate"  # Different key for production
    # ... same backend config as staging
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

# Import existing production instance into Terraform
# First, get the OCID of the existing instance:
# oci compute instance list --compartment-id <compartment_ocid> --display-name <name>

# Then import it:
# terraform import oci_core_instance.hexhaven_production <instance_ocid>

# Define the instance resource to match existing configuration
resource "oci_core_instance" "hexhaven_production" {
  # ... match current production instance settings

  create_vnic_details {
    subnet_id        = oci_core_subnet.hexhaven_subnet.id
    assign_public_ip = true
    # Important: Do NOT attach NSGs unless you want them
    # nsg_ids = []  # Leave empty to use Security Lists only
  }
}

# Explicitly define NO NSGs (use Security Lists instead)
# This ensures Terraform removes any manually-added NSGs
```

#### Import Existing Production Instance

```bash
# Get instance OCID
oci compute instance list \
  --compartment-id <your_compartment_ocid> \
  --query "data[?\"public-ip\"=='129.213.88.197'].id | [0]" \
  --raw-output

# Import into Terraform
cd infrastructure/terraform/environments/production
terraform import oci_core_instance.hexhaven_production <instance_ocid>

# Run terraform plan to see differences
terraform plan

# Remove any NSGs if found
terraform apply
```

### Option 3: Add NSG Configuration to Terraform (If NSGs Are Desired)

If you actually WANT to use NSGs (more granular than Security Lists):

```hcl
# Network Security Group
resource "oci_core_network_security_group" "hexhaven_nsg" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.hexhaven_vcn.id
  display_name   = "hexhaven-app-nsg"
}

# NSG Rule: Allow HTTP
resource "oci_core_network_security_group_security_rule" "hexhaven_nsg_http" {
  network_security_group_id = oci_core_network_security_group.hexhaven_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP

  source      = "0.0.0.0/0"
  source_type = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}

# NSG Rule: Allow HTTPS
resource "oci_core_network_security_group_security_rule" "hexhaven_nsg_https" {
  network_security_group_id = oci_core_network_security_group.hexhaven_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP

  source      = "0.0.0.0/0"
  source_type = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
}

# NSG Rule: Allow SSH
resource "oci_core_network_security_group_security_rule" "hexhaven_nsg_ssh" {
  network_security_group_id = oci_core_network_security_group.hexhaven_nsg.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP

  source      = "0.0.0.0/0"
  source_type = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

# Attach NSG to instance
resource "oci_core_instance" "hexhaven_production" {
  # ... other config ...

  create_vnic_details {
    subnet_id        = oci_core_subnet.hexhaven_subnet.id
    assign_public_ip = true
    nsg_ids          = [oci_core_network_security_group.hexhaven_nsg.id]
  }
}
```

## Verification Steps

### 1. Check Current Instance Configuration

```bash
# SSH to production
ssh ubuntu@129.213.88.197

# Run diagnostics
cd /opt/hexhaven
./scripts/network-diagnostics.sh

# Look for:
# - Section 1: Public IP assigned?
# - Section 5: NSGs detected?
# - Section 4: iptables rules correct?
```

### 2. Verify OCI Console

**Check Instance Details:**
1. Compute → Instances → Find `129.213.88.197`
2. Note the instance name (is it "hexhaven-staging" or something else?)
3. Check Attached VNICs → Primary VNIC → Network Security Groups
4. If NSGs present → Click each → Check Security Rules

**Check Subnet Configuration:**
1. Networking → Virtual Cloud Networks
2. Find the VCN → Subnets → Find instance's subnet
3. Check attached Security Lists
4. Verify Security List has port 80 ingress rule

### 3. Test Connectivity

```bash
# From your local machine
curl -v http://129.213.88.197/health

# If it times out:
# - NSGs are blocking (most likely)
# - Or no public IP assigned
# - Or subnet routing issue

# If it connects:
# - Application issue (not network)
```

## Recommendations

### Short-term (Immediate Fix):
1. Use OCI Console to check for NSGs on production instance
2. Add port 80 ingress rule to any NSGs found
3. Test connectivity

### Long-term (Best Practice):
1. Create separate Terraform configurations for staging and production
2. Import existing production infrastructure into Terraform
3. Use Terraform to manage ALL network configuration (Security Lists + NSGs)
4. Document which firewall layer you're using:
   - **Security Lists only** (simpler, good for most cases)
   - **NSGs** (more granular, better for complex setups)
   - **Both** (not recommended, confusing)

## Key Takeaways

1. **Your Terraform is correct** - Security Lists properly configured ✅
2. **Production instance is not managed by this Terraform** - Different instance ❌
3. **NSGs likely blocking traffic** - Not defined in Terraform, may be manually added ❌
4. **Solution**: Check OCI Console for NSGs, add port 80 rule

## Next Steps

Run the diagnostics script on production and share the output:
```bash
ssh ubuntu@129.213.88.197
cd /opt/hexhaven
./scripts/network-diagnostics.sh > /tmp/diagnostics.txt 2>&1
cat /tmp/diagnostics.txt
```

This will tell us exactly:
- If the instance has a public IP
- If NSGs are attached
- If iptables rules are correct
- What's blocking access

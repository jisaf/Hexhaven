# Deployment Setup Guide

This guide explains how to set up SSH keys for automated deployments to staging and production servers.

## SSH Key Setup

### 1. Generate SSH Key Pair (if needed)

On your local machine or CI server:

```bash
# Generate a new SSH key pair for deployment
ssh-keygen -t ed25519 -C "hexhaven-deployment" -f ~/.ssh/hexhaven_deploy

# This creates two files:
# - hexhaven_deploy (private key - for GitHub Secrets)
# - hexhaven_deploy.pub (public key - for the server)
```

### 2. Add Public Key to Production Server

Copy the public key to the production server:

```bash
# Method 1: Using ssh-copy-id (easiest)
ssh-copy-id -i ~/.ssh/hexhaven_deploy.pub ubuntu@YOUR_SERVER_IP

# Method 2: Manual copy
cat ~/.ssh/hexhaven_deploy.pub
# Copy the output and paste it into ~/.ssh/authorized_keys on the server
```

Or manually on the server:

```bash
# SSH into the server
ssh ubuntu@YOUR_SERVER_IP

# Add the public key to authorized_keys
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste the public key content here, each key on a new line

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
```

### 3. Add Private Key to GitHub Secrets

**IMPORTANT**: The private key must be added to GitHub Secrets with proper newline characters preserved.

1. Go to your GitHub repository
2. Navigate to: Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `PRODUCTION_SSH_KEY` (or `STAGING_SSH_KEY`)
5. Value: Copy the **entire** private key including headers

```bash
# Copy the private key (this preserves newlines)
cat ~/.ssh/hexhaven_deploy

# The output should look like:
# -----BEGIN OPENSSH PRIVATE KEY-----
# b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
# ... (many more lines) ...
# -----END OPENSSH PRIVATE KEY-----

# Copy ALL of this including the BEGIN and END lines
```

6. Paste this entire content into the secret value field
7. Click "Add secret"

### 4. Verify SSH Key Format

The workflow will automatically validate the SSH key format. If you see an error like:

```
Error: Invalid SSH key format!
Please ensure PRODUCTION_SSH_KEY secret contains a valid private key with proper newlines.
```

This means:
- The key wasn't pasted correctly (missing newlines)
- The key is corrupted
- The key format is incorrect

**Fix**: Delete the secret and re-add it, ensuring you copy the ENTIRE key including all newlines.

### 5. Test SSH Connection

Before running the deployment, test the SSH connection manually:

```bash
# Test with the same key
ssh -i ~/.ssh/hexhaven_deploy ubuntu@YOUR_SERVER_IP

# If this works, the GitHub Actions deployment should work too
```

## Required GitHub Secrets

### For Production Deployment:
- `PRODUCTION_SSH_KEY`: SSH private key for production server
- `PRODUCTION_HOST`: (Optional) Production server IP/hostname (defaults to 150.136.88.138)

### For Staging Deployment:
- `STAGING_SSH_KEY`: SSH private key for staging server

## Troubleshooting

### Permission denied (publickey)

**Cause**: SSH authentication is failing.

**Solutions**:
1. Verify the public key is in `~/.ssh/authorized_keys` on the server
2. Check the private key is correctly stored in GitHub Secrets (with newlines preserved)
3. Ensure the `ubuntu` user exists on the server
4. Verify SSH service is running on the server
5. Check server firewall allows SSH connections

### Invalid SSH key format

**Cause**: The private key in GitHub Secrets is corrupted or incorrectly formatted.

**Solutions**:
1. Re-copy the private key ensuring all newlines are preserved
2. Verify the key starts with `-----BEGIN` and ends with `-----END`
3. Don't manually edit the key or add/remove any characters

### SSH connection timeout

**Cause**: Cannot reach the server.

**Solutions**:
1. Verify the server IP/hostname is correct
2. Check network connectivity
3. Verify firewall rules allow SSH (port 22)
4. Ensure the server is running

## Security Best Practices

1. **Use dedicated deployment keys**: Don't reuse personal SSH keys
2. **Limit key permissions**: The deployment user should have minimal required permissions
3. **Rotate keys regularly**: Update SSH keys periodically
4. **Monitor deployments**: Review deployment logs for suspicious activity
5. **Use environment protection rules**: Enable GitHub environment protection for production

## Additional Resources

- [GitHub Actions - Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [SSH Key Authentication](https://www.ssh.com/academy/ssh/public-key-authentication)

# HexHaven Staging Deployment Guide

This document provides comprehensive instructions for setting up and deploying HexHaven to the staging server.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Initial Server Setup](#initial-server-setup)
- [GitHub Configuration](#github-configuration)
- [Deployment Process](#deployment-process)
- [Troubleshooting](#troubleshooting)
- [Monitoring](#monitoring)

## Overview

HexHaven uses a GitHub Actions-based deployment pipeline to automatically deploy code to the staging server at `150.136.88.138`. The deployment process includes:

- Building backend and frontend code
- Creating deployment archives
- SSH-based deployment to staging server
- Running database migrations
- Restarting services
- Health checks

## Prerequisites

Before setting up deployment, ensure you have:

1. **Server Access**
   - Root or sudo access to staging server (150.136.88.138)
   - SSH access configured

2. **GitHub Access**
   - Repository admin access to configure secrets
   - Ability to push to main/master branch

3. **Local Requirements** (for initial setup)
   - SSH client
   - SSH key pair for deployment

## Initial Server Setup

### Step 1: Connect to Server

```bash
ssh root@150.136.88.138
```

### Step 2: Download Setup Script

```bash
# Clone repository or download setup script
git clone https://github.com/jisaf/Hexhaven.git /tmp/hexhaven
cd /tmp/hexhaven/scripts

# Or download directly
curl -O https://raw.githubusercontent.com/jisaf/Hexhaven/main/scripts/setup-server.sh
```

### Step 3: Run Setup Script

```bash
# Make script executable
chmod +x setup-server.sh

# Run setup (requires root)
sudo ./setup-server.sh
```

The setup script will:
- Install Node.js 20.x, PostgreSQL, and Nginx
- Create deployment user (`hexhaven`)
- Configure database with secure credentials
- Set up systemd services
- Configure Nginx reverse proxy
- Set up firewall rules

**Important:** The script will output database credentials and other important information. Save this output securely!

### Step 4: Configure SSH Access for Deployment

Generate an SSH key pair for GitHub Actions deployment:

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-hexhaven" -f ~/.ssh/hexhaven_deploy
```

Add the public key to the server:

```bash
# Copy public key
cat ~/.ssh/hexhaven_deploy.pub

# On the server, as the deployment user
ssh root@150.136.88.138
su - hexhaven
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Test SSH access:

```bash
ssh -i ~/.ssh/hexhaven_deploy hexhaven@150.136.88.138
```

## GitHub Configuration

### Step 1: Add SSH Private Key Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add secret:
   - **Name:** `STAGING_SSH_KEY`
   - **Value:** Contents of `~/.ssh/hexhaven_deploy` (private key)

```bash
# Copy private key content
cat ~/.ssh/hexhaven_deploy
```

### Step 2: Add Environment Variables (Optional)

If you need to customize deployment, add these secrets:

- `STAGING_DB_URL` - Database connection string (if different from default)
- `STAGING_SESSION_SECRET` - Session secret for backend
- `STAGING_CORS_ORIGIN` - CORS origin URL

### Step 3: Verify Workflow Configuration

The deployment workflow is located at `.github/workflows/staging-deploy.yml`.

Default configuration:
- **Staging Host:** 150.136.88.138
- **Deploy User:** hexhaven
- **Deploy Path:** /opt/hexhaven
- **Backend Port:** 3000
- **Frontend Port:** 80

## Deployment Process

### Automatic Deployment

Deployments are triggered automatically when:
- Code is pushed to `main` or `master` branch
- Manual workflow dispatch is triggered

### Manual Deployment

To manually trigger a deployment:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to Staging** workflow
3. Click **Run workflow**
4. Select branch and click **Run workflow**

### Deployment Steps

The GitHub Actions workflow performs these steps:

1. **Build Phase**
   - Checkout code
   - Install dependencies
   - Build backend (NestJS)
   - Build frontend (Vite/React)

2. **Package Phase**
   - Create deployment archive
   - Include built files and deployment script

3. **Transfer Phase**
   - Setup SSH connection
   - Upload deployment package to server

4. **Deploy Phase**
   - Stop existing services
   - Backup current deployment
   - Extract new deployment
   - Run deployment script (migrations, etc.)
   - Start services

5. **Verification Phase**
   - Check service status
   - Verify health endpoints
   - Report deployment status

### Deployment Script Details

The `deploy.sh` script (runs on server) performs:

```bash
# Environment setup
- Load environment variables from .env

# Backend setup
- Install/update npm dependencies
- Generate Prisma client
- Run database migrations

# Verification
- Verify backend build exists
- Verify frontend build exists
- Create deployment marker

# Health checks
- Verify services are running
- Check port availability
```

## Troubleshooting

### Common Issues

#### 1. SSH Connection Failed

**Symptoms:** `Permission denied (publickey)` or connection timeout

**Solutions:**
```bash
# Verify SSH key is correct
ssh -i ~/.ssh/hexhaven_deploy hexhaven@150.136.88.138

# Check SSH key is added to GitHub Secrets
# Check server firewall allows SSH (port 22)
sudo ufw status

# Check SSH service is running on server
sudo systemctl status ssh
```

#### 2. Database Migration Failures

**Symptoms:** Deployment fails at migration step

**Solutions:**
```bash
# Connect to server
ssh hexhaven@150.136.88.138

# Check database connection
psql -U hexhaven_user -d hexhaven_staging

# Check DATABASE_URL in .env
cat /opt/hexhaven/.env | grep DATABASE_URL

# Manually run migrations
cd /opt/hexhaven/backend
npx prisma migrate deploy
```

#### 3. Service Won't Start

**Symptoms:** Service status shows "failed" or "inactive"

**Solutions:**
```bash
# Check service logs
sudo journalctl -u hexhaven-backend -n 50

# Check for port conflicts
sudo netstat -tulpn | grep :3000

# Verify Node.js version
node --version  # Should be 20.x

# Check environment variables
sudo systemctl show hexhaven-backend --property=Environment

# Restart service
sudo systemctl restart hexhaven-backend
```

#### 4. Build Failures

**Symptoms:** GitHub Actions build step fails

**Solutions:**
- Check build logs in GitHub Actions
- Verify all dependencies are in package.json
- Ensure TypeScript compilation passes locally
- Check for linting errors: `npm run lint`

#### 5. Health Check Failures

**Symptoms:** Deployment completes but health checks fail

**Solutions:**
```bash
# Check if backend is responding
curl http://150.136.88.138:3000/health

# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t
```

### Rollback Procedure

If a deployment fails and you need to rollback:

```bash
# Connect to server
ssh hexhaven@150.136.88.138

# List available backups
ls -lht /opt/hexhaven.backup.* | head -5

# Stop current services
sudo systemctl stop hexhaven-backend

# Restore backup (replace timestamp)
sudo rm -rf /opt/hexhaven
sudo cp -r /opt/hexhaven.backup.20241111_123456 /opt/hexhaven
sudo chown -R hexhaven:hexhaven /opt/hexhaven

# Start services
sudo systemctl start hexhaven-backend

# Verify
curl http://150.136.88.138/health
```

## Monitoring

### Service Status

```bash
# Check all services
sudo systemctl status hexhaven-backend
sudo systemctl status nginx

# Check resource usage
htop
df -h  # Disk space
free -h  # Memory
```

### Logs

```bash
# Backend application logs
sudo journalctl -u hexhaven-backend -f

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -xe
```

### Health Endpoints

```bash
# Backend health
curl http://150.136.88.138/health

# Frontend (should return HTML)
curl -I http://150.136.88.138/

# WebSocket endpoint
curl http://150.136.88.138/socket.io/
```

### Database

```bash
# Connect to database
psql -U hexhaven_user -d hexhaven_staging

# Check database size
\l+

# Check table sizes
\dt+

# Check active connections
SELECT * FROM pg_stat_activity;
```

## Security Considerations

1. **SSH Keys**
   - Keep private keys secure
   - Rotate keys periodically
   - Use key-based authentication only (no passwords)

2. **Environment Variables**
   - Never commit `.env` files
   - Use GitHub Secrets for sensitive data
   - Rotate secrets periodically

3. **Database**
   - Use strong passwords
   - Restrict database access to localhost
   - Regular backups

4. **Firewall**
   - Only open necessary ports (22, 80, 443)
   - Use fail2ban for brute force protection
   - Keep system updated

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review deployment logs
   - Check disk space
   - Monitor error rates

2. **Monthly**
   - Update system packages: `sudo apt update && sudo apt upgrade`
   - Review and clean old backups
   - Database optimization: `VACUUM ANALYZE;`

3. **Quarterly**
   - Rotate SSH keys
   - Rotate database passwords
   - Security audit

### Backup Strategy

Automated backups are created before each deployment:
- Location: `/opt/hexhaven.backup.TIMESTAMP/`
- Retention: Last 5 backups kept
- Manual backups: Use `tar -czf backup.tar.gz /opt/hexhaven`

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review deployment logs in GitHub Actions
3. Check server logs: `sudo journalctl -u hexhaven-backend -n 100`
4. Contact DevOps team

---

**Last Updated:** 2025-11-11
**Version:** 1.0.0

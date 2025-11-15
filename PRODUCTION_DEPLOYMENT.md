# Hexhaven Production Deployment Guide

This guide covers the setup and deployment of Hexhaven to production at **150.136.88.138**.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Initial Server Setup](#initial-server-setup)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Deployment Methods](#deployment-methods)
- [Troubleshooting](#troubleshooting)
- [Monitoring](#monitoring)

## Overview

Hexhaven uses GitHub Actions for automated deployments. The system supports:

- **Automatic deployment** when code is merged to the `main` branch
- **Manual deployment** via GitHub Actions workflow dispatch
- **Server-side configuration** - Database credentials and settings managed on the server
- **Zero-downtime deployments** with automatic backups
- **Health checks** to verify successful deployment

### Key Features

- **No manual `.env` file management** - Environment configuration is automatically generated during each deployment
- **Auto-generated session secrets** - Fresh session secret created for each deployment
- **Server-side configuration** - Database credentials stay on the server, never in GitHub
- **Minimal secrets required** - Only SSH key needed in GitHub (database config lives on server)
- **Easy configuration updates** - Update server config file and redeploy to apply changes

### Architecture

```
Internet (Port 80/443)
    ↓
Nginx (Reverse Proxy + Static Files)
    ├─→ / → Frontend (Static Files)
    ├─→ /api → Backend (Port 3000)
    └─→ /socket.io → Backend WebSocket (Port 3000)

Backend → PostgreSQL Database
```

## Quick Start

### For Automated Deployment

Once configured, deployment is automatic:

1. Merge code to `main` branch
2. GitHub Actions automatically builds and deploys
3. Monitor deployment in GitHub Actions tab

### For Manual Deployment

1. Go to GitHub repository
2. Click **Actions** tab
3. Select **Deploy to Production** workflow
4. Click **Run workflow**
5. Select `main` branch and click **Run workflow**

## Initial Server Setup

### Prerequisites

- Root or sudo access to production server (150.136.88.138)
- GitHub repository admin access
- SSH client installed locally

### Step 1: Server Preparation

Connect to your production server:

```bash
ssh root@150.136.88.138
```

Run the automated setup script (if not already done):

```bash
# Clone repository temporarily
git clone https://github.com/jisaf/Hexhaven.git /tmp/hexhaven
cd /tmp/hexhaven/scripts

# Make setup script executable
chmod +x setup-server.sh

# Run setup (requires root)
sudo ./setup-server.sh
```

The setup script installs:
- Node.js 20.x
- PostgreSQL 14+
- Nginx
- PM2 (process manager)
- Required system packages

**Important:** Save the database credentials and other information output by the script!

### Step 2: Create Deployment User

If not created by the setup script:

```bash
# Create deployment user
sudo useradd -m -s /bin/bash hexhaven

# Add to necessary groups
sudo usermod -aG sudo hexhaven

# Create deployment directory
sudo mkdir -p /opt/hexhaven
sudo chown hexhaven:hexhaven /opt/hexhaven
```

### Step 3: Configure Server Settings

**Important:** Environment configuration is stored on the server in `/opt/hexhaven/.server-config`. This file persists across deployments and contains your database credentials and other server-specific settings.

The deployment workflow will:
1. Automatically create `/opt/hexhaven/.server-config` if it doesn't exist
2. Generate a fresh `.env` file from the server config during each deployment
3. Auto-generate a new session secret for each deployment

**Initial Setup:**

After the first deployment, update the server configuration with your database credentials:

```bash
# SSH to server
ssh hexhaven@150.136.88.138

# Update database URL
/opt/hexhaven/server-config.sh update DATABASE_URL \
  "postgresql://hexhaven_user:YOUR_PASSWORD@localhost:5432/hexhaven_production?schema=public"

# View current configuration
/opt/hexhaven/server-config.sh show

# Trigger a deployment to apply changes
# (or it will be applied on next automatic deployment)
```

**Security Note:** Session secrets are automatically generated fresh for each deployment. Database credentials stay on the server and are never stored in GitHub.

### Step 4: Setup Systemd Service

Create systemd service for the backend:

```bash
sudo nano /etc/systemd/system/hexhaven-backend.service
```

Add this configuration:

```ini
[Unit]
Description=Hexhaven Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=hexhaven
WorkingDirectory=/opt/hexhaven/backend
Environment=NODE_ENV=production
EnvironmentFile=/opt/hexhaven/.env
ExecStart=/usr/bin/node dist/backend/src/main.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hexhaven-backend

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable hexhaven-backend
```

### Step 5: Configure Nginx

Create Nginx configuration:

```bash
sudo nano /etc/nginx/conf.d/hexhaven.conf
```

Add this configuration:

```nginx
# Hexhaven Production Configuration

# Upstream backend
upstream hexhaven_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name 150.136.88.138;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend - Static files
    location / {
        root /var/www/hexhaven/frontend;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://hexhaven_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://hexhaven_backend/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://hexhaven_backend/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Logging
    access_log /var/log/nginx/hexhaven-access.log;
    error_log /var/log/nginx/hexhaven-error.log;
}
```

Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Configure Firewall

Ensure ports are open:

```bash
# Allow HTTP
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Or if using ufw
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Reload firewall
sudo firewall-cmd --reload
```

## GitHub Secrets Configuration

### Step 1: Generate SSH Key Pair

On your local machine:

```bash
# Generate ED25519 key (more secure)
ssh-keygen -t ed25519 -C "github-actions-hexhaven-production" -f ~/.ssh/hexhaven_production

# Or generate RSA key
ssh-keygen -t rsa -b 4096 -C "github-actions-hexhaven-production" -f ~/.ssh/hexhaven_production
```

### Step 2: Add Public Key to Server

```bash
# Display public key
cat ~/.ssh/hexhaven_production.pub

# Copy the output, then on the server:
ssh root@150.136.88.138

# Switch to deployment user
sudo su - hexhaven

# Add public key
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

### Step 3: Test SSH Connection

```bash
# Test from local machine
ssh -i ~/.ssh/hexhaven_production hexhaven@150.136.88.138

# If successful, you should be logged in without password
```

### Step 4: Add Secret to GitHub

1. Go to your GitHub repository: `https://github.com/jisaf/Hexhaven`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:

   **Name:** `PRODUCTION_SSH_KEY`

   **Value:** Contents of the private key file

   ```bash
   # Get private key contents
   cat ~/.ssh/hexhaven_production
   ```

   Copy the entire output including `-----BEGIN ... KEY-----` and `-----END ... KEY-----`

5. Click **Add secret**

### Step 5: Verify SSH Key Secret

**Required:** Only one GitHub Secret is needed for deployment: the SSH private key.

Navigate to **Settings** → **Secrets and variables** → **Actions** and verify:

#### Required Secret:

**`PRODUCTION_SSH_KEY`** - SSH private key for deployment access
- This is the only secret needed in GitHub
- Contains the private key generated in Step 2
- Used to securely connect to the server during deployment

**That's it!** All other configuration (database URL, CORS settings, etc.) is managed on the server via `/opt/hexhaven/.server-config`.

#### Benefits of Server-Side Configuration:

✅ **Security** - Database credentials never leave the server
✅ **Simplicity** - Only one GitHub Secret to manage
✅ **Flexibility** - Update server config without touching GitHub
✅ **Audit Trail** - Configuration changes are logged on the server
✅ **Auto-Generated Secrets** - Session secrets created fresh each deployment

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)

Automatic deployment happens when code is merged to `main`:

1. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make changes and commit:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. Push to GitHub:
   ```bash
   git push origin feature/my-feature
   ```

4. Create Pull Request and merge to `main`

5. GitHub Actions automatically:
   - Runs tests
   - Builds backend and frontend
   - Deploys to production
   - Verifies deployment

6. Monitor deployment in GitHub Actions tab

### Method 2: Manual Deployment

For on-demand deployments:

1. **Via GitHub UI:**
   - Go to repository on GitHub
   - Click **Actions** tab
   - Select **Deploy to Production** workflow
   - Click **Run workflow** button
   - Select branch (usually `main`)
   - Click **Run workflow**

2. **Via GitHub CLI:**
   ```bash
   gh workflow run production-deploy.yml --ref main
   ```

3. Monitor progress:
   ```bash
   gh run list --workflow=production-deploy.yml
   gh run watch  # Watch latest run
   ```

### What Happens During Deployment

1. **Build Phase:**
   - Checkout code
   - Install dependencies
   - Run tests and linting
   - Build backend (TypeScript → JavaScript)
   - Build frontend (Vite/React → Static files)

2. **Package Phase:**
   - Create deployment archive with:
     - Built backend files
     - Built frontend files
     - Database migration files
     - Deployment scripts
     - Server configuration script

3. **Transfer Phase:**
   - Establish SSH connection
   - Upload deployment package to `/tmp/` on server

4. **Deploy Phase:**
   - Stop backend service
   - Create backup of current deployment
   - Extract new deployment
   - **Initialize server configuration** (if first deployment)
   - **Generate fresh `.env` file** from server config + auto-generated session secret
   - Install backend dependencies
   - Run database migrations
   - Deploy frontend to Nginx directory
   - Start backend service
   - Reload Nginx

5. **Verification Phase:**
   - Wait for services to start
   - Check health endpoints
   - Report deployment status

### Deployment Timing

- **Build time:** ~3-5 minutes
- **Transfer time:** ~30 seconds
- **Deployment time:** ~1-2 minutes
- **Total:** ~5-8 minutes

## Troubleshooting

### Deployment Fails - SSH Connection Error

**Symptoms:** `Permission denied (publickey)` or connection timeout

**Solutions:**

1. Verify SSH key is correct:
   ```bash
   ssh -i ~/.ssh/hexhaven_production hexhaven@150.136.88.138
   ```

2. Check GitHub secret:
   - Go to Settings → Secrets → Actions
   - Verify `PRODUCTION_SSH_KEY` exists
   - Delete and recreate if necessary

3. Check server SSH configuration:
   ```bash
   sudo systemctl status sshd
   sudo tail -f /var/log/auth.log  # or /var/log/secure
   ```

### Deployment Fails - Build Error

**Symptoms:** Build step fails in GitHub Actions

**Solutions:**

1. Check build logs in GitHub Actions
2. Verify locally:
   ```bash
   npm ci
   npm run test
   npm run lint
   npm run build
   ```
3. Fix errors and push fix to `main`

### Deployment Fails - Database Migration Error

**Symptoms:** Deployment fails at migration step

**Solutions:**

1. SSH to server:
   ```bash
   ssh hexhaven@150.136.88.138
   ```

2. Check database connection:
   ```bash
   cd /opt/hexhaven
   cat .env | grep DATABASE_URL
   psql "$(grep DATABASE_URL .env | cut -d= -f2)"
   ```

3. Run migrations manually:
   ```bash
   cd /opt/hexhaven/backend
   npx prisma migrate deploy
   ```

### Backend Service Won't Start

**Symptoms:** Service status shows "failed"

**Solutions:**

1. Check service logs:
   ```bash
   sudo journalctl -u hexhaven-backend -n 100 --no-pager
   ```

2. Check for port conflicts:
   ```bash
   sudo netstat -tulpn | grep :3000
   ```

3. Verify environment file:
   ```bash
   cat /opt/hexhaven/.env
   ```

4. Check permissions:
   ```bash
   ls -la /opt/hexhaven/backend/dist/backend/src/main.js
   ```

5. Try starting manually:
   ```bash
   cd /opt/hexhaven/backend
   node dist/backend/src/main.js
   ```

### Frontend Not Loading

**Symptoms:** Browser shows error or old version

**Solutions:**

1. Check Nginx configuration:
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

2. Verify files are deployed:
   ```bash
   ls -la /var/www/hexhaven/frontend/index.html
   ```

3. Check Nginx error logs:
   ```bash
   sudo tail -f /var/log/nginx/hexhaven-error.log
   ```

4. Clear browser cache (Ctrl+Shift+R)

### Health Check Fails

**Symptoms:** Deployment completes but health check fails

**Solutions:**

1. Check if backend is responding:
   ```bash
   curl http://150.136.88.138/health
   curl http://localhost:3000/health  # From server
   ```

2. Check backend logs:
   ```bash
   sudo journalctl -u hexhaven-backend -f
   ```

3. Verify Nginx proxy configuration:
   ```bash
   sudo nginx -t
   sudo tail -f /var/log/nginx/error.log
   ```

### Environment Variable / Configuration Issues

**Symptoms:** Backend fails to start, database connection errors, missing configuration

**Common Causes:**
- Missing or incorrect server configuration
- Database URL not set or incorrect
- Database not accessible

**Solutions:**

1. Check server configuration file:
   ```bash
   ssh hexhaven@150.136.88.138

   # View current configuration (passwords masked)
   /opt/hexhaven/server-config.sh show

   # Check if config file exists
   ls -la /opt/hexhaven/.server-config
   ```

2. Verify `.env` file was generated:
   ```bash
   # On server
   cat /opt/hexhaven/.env

   # Should contain:
   # - NODE_ENV=production
   # - DATABASE_URL=postgresql://...
   # - SESSION_SECRET=... (auto-generated)
   ```

3. Update database URL if needed:
   ```bash
   # On server
   /opt/hexhaven/server-config.sh update DATABASE_URL \
     "postgresql://hexhaven_user:YOUR_PASSWORD@localhost:5432/hexhaven_production?schema=public"

   # Verify update
   /opt/hexhaven/server-config.sh show

   # Trigger deployment to regenerate .env
   # Go to GitHub Actions and run "Deploy to Production"
   ```

4. Test database connection:
   ```bash
   # On server
   psql "$(grep DATABASE_URL /opt/hexhaven/.env | cut -d= -f2-)"

   # Or check if database exists
   sudo -u postgres psql -l | grep hexhaven
   ```

### Managing Server Configuration

To update environment variables or server settings:

#### Update Server Configuration

1. **SSH to server:**
   ```bash
   ssh hexhaven@150.136.88.138
   ```

2. **Update configuration value:**
   ```bash
   # Update database URL
   /opt/hexhaven/server-config.sh update DATABASE_URL \
     "postgresql://newuser:newpass@localhost:5432/hexhaven_production?schema=public"

   # Update CORS origin (if using custom domain)
   /opt/hexhaven/server-config.sh update CORS_ORIGIN "https://yourdomain.com"

   # Update log level
   /opt/hexhaven/server-config.sh update LOG_LEVEL "debug"

   # Add Redis URL
   /opt/hexhaven/server-config.sh update REDIS_URL "redis://localhost:6379"
   ```

3. **Trigger deployment to apply:**
   - Go to GitHub Actions
   - Run "Deploy to Production" workflow manually
   - OR wait for next automatic deployment

4. **Verify:**
   ```bash
   # View configuration (passwords masked)
   /opt/hexhaven/server-config.sh show

   # Check generated .env after deployment
   cat /opt/hexhaven/.env | grep -i "DATABASE_URL\|CORS"
   ```

#### Session Secret Rotation

**Good news:** Session secrets are automatically rotated with each deployment!

- A fresh session secret is generated for every deployment
- No manual rotation needed
- Users may need to re-authenticate after deployment

#### Database Password Rotation

1. Update database password:
   ```bash
   # On server as postgres user
   sudo -u postgres psql
   ALTER USER hexhaven_user WITH PASSWORD 'new_password';
   \q
   ```

2. Update server configuration:
   ```bash
   /opt/hexhaven/server-config.sh update DATABASE_URL \
     "postgresql://hexhaven_user:new_password@localhost:5432/hexhaven_production?schema=public"
   ```

3. Deploy to apply changes

**Security Note:**
- Server configuration is backed up with each deployment to `/opt/hexhaven.backup.TIMESTAMP/.server-config`
- Configuration file has 600 permissions (owner read/write only)
- Never commit `.server-config` to the repository

### Rollback to Previous Version

If deployment fails and you need to rollback:

```bash
# SSH to server
ssh hexhaven@150.136.88.138

# List backups
ls -lht /opt/ | grep hexhaven.backup

# Stop service
sudo systemctl stop hexhaven-backend

# Restore backup (replace with actual backup name)
sudo rm -rf /opt/hexhaven
sudo cp -r /opt/hexhaven.backup.20241113_123456 /opt/hexhaven
sudo chown -R hexhaven:hexhaven /opt/hexhaven

# Restore frontend
sudo cp -r /opt/hexhaven/frontend /var/www/hexhaven/

# Start service
sudo systemctl start hexhaven-backend
sudo systemctl reload nginx

# Verify
curl http://150.136.88.138/health
```

## Monitoring

### Service Status

Check all services:

```bash
# Backend service
sudo systemctl status hexhaven-backend

# Nginx
sudo systemctl status nginx

# PostgreSQL
sudo systemctl status postgresql
```

### Application Logs

Monitor application logs:

```bash
# Backend logs (real-time)
sudo journalctl -u hexhaven-backend -f

# Backend logs (last 100 lines)
sudo journalctl -u hexhaven-backend -n 100 --no-pager

# Nginx access logs
sudo tail -f /var/log/nginx/hexhaven-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/hexhaven-error.log
```

### Health Checks

Test application health:

```bash
# Backend health
curl http://150.136.88.138/health

# Frontend (should return HTML)
curl -I http://150.136.88.138/

# API endpoint test
curl http://150.136.88.138/api/

# WebSocket endpoint
curl http://150.136.88.138/socket.io/
```

### Resource Usage

Monitor system resources:

```bash
# CPU and memory
htop

# Or using top
top

# Disk usage
df -h

# Memory usage
free -h

# Check specific process
ps aux | grep node
```

### Database Monitoring

```bash
# Connect to database
psql -U hexhaven_user -d hexhaven_production

# Check database size
\l+

# Check table sizes
\dt+

# Active connections
SELECT count(*) FROM pg_stat_activity;

# Long-running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 seconds';
```

### Deployment History

Check deployment history:

```bash
# On server
cat /opt/hexhaven/DEPLOYMENT_INFO.txt

# View backups
ls -lht /opt/ | grep hexhaven.backup | head -5

# GitHub Actions history
gh run list --workflow=production-deploy.yml --limit 10
```

## Security Best Practices

### 1. SSH Keys

- Use Ed25519 keys (more secure than RSA)
- Rotate keys every 6 months
- Never commit private keys to repository
- Use different keys for staging and production

### 2. Environment Variables

- Never commit `.env` files
- Use GitHub Secrets for sensitive data
- Rotate secrets regularly
- Use different credentials for dev/staging/production

### 3. Database

- Use strong passwords (minimum 20 characters)
- Restrict database access to localhost
- Regular backups (automated daily)
- Enable SSL connections

### 4. Firewall

- Only open necessary ports (22, 80, 443)
- Use fail2ban for SSH brute force protection
- Consider IP whitelisting for SSH
- Keep system packages updated

### 5. Application

- Keep dependencies updated
- Use security headers (already in Nginx config)
- Enable rate limiting
- Monitor for security vulnerabilities

## Maintenance Tasks

### Daily

- Monitor error logs
- Check service health
- Review deployment logs

### Weekly

- Check disk space
- Review Nginx access logs
- Monitor database size

### Monthly

- Update system packages:
  ```bash
  sudo yum update  # or apt update && apt upgrade
  ```
- Review and clean old backups
- Database maintenance:
  ```bash
  psql -U hexhaven_user -d hexhaven_production -c "VACUUM ANALYZE;"
  ```
- Review application dependencies

### Quarterly

- Rotate SSH keys
- Rotate database passwords
- Security audit
- Performance review

## Backup Strategy

### Automatic Backups

- Deployment backups: Created before each deployment
- Location: `/opt/hexhaven.backup.TIMESTAMP/`
- Retention: Last 5 backups (cleaned automatically)

### Manual Database Backup

```bash
# Create backup
pg_dump -U hexhaven_user hexhaven_production > backup_$(date +%Y%m%d).sql

# Or compressed
pg_dump -U hexhaven_user hexhaven_production | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore from Backup

```bash
# Restore database
psql -U hexhaven_user hexhaven_production < backup_20241113.sql

# Or from compressed
gunzip -c backup_20241113.sql.gz | psql -U hexhaven_user hexhaven_production
```

## Performance Optimization

### Enable Compression

Nginx already configured with:
- Gzip compression for text files
- Static asset caching (1 year)
- Keep-alive connections

### Database Connection Pooling

Configure in backend `.env`:

```env
# Example connection pool settings
DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public&connection_limit=20&pool_timeout=30"
```

### PM2 Cluster Mode (Alternative to systemd)

For better performance with multiple CPU cores:

```bash
# Install PM2
npm install -g pm2

# Start with cluster mode
pm2 start /opt/hexhaven/backend/dist/backend/src/main.js \
  --name hexhaven-backend \
  --instances max \
  --exec-mode cluster

# Save PM2 configuration
pm2 save
pm2 startup
```

## Support and Resources

### Documentation

- **This file:** Production deployment guide
- `scripts/DEPLOYMENT.md` - Staging deployment guide
- `infrastructure/DEPLOYMENT.md` - Server setup guide

### Useful Commands Quick Reference

```bash
# Deployment
gh workflow run production-deploy.yml --ref main

# Logs
sudo journalctl -u hexhaven-backend -f
sudo tail -f /var/log/nginx/hexhaven-error.log

# Service management
sudo systemctl restart hexhaven-backend
sudo systemctl reload nginx

# Health checks
curl http://150.136.88.138/health

# Database
psql -U hexhaven_user -d hexhaven_production
```

### GitHub Secrets Quick Reference

Minimal GitHub Secrets required for deployment:

#### Required Secret

| Secret Name | Description | How to Generate |
|------------|-------------|-----------------|
| `PRODUCTION_SSH_KEY` | SSH private key for deployment | `ssh-keygen -t ed25519 -C "hexhaven-production"` |

**That's it!** Only one secret needed in GitHub.

**To Add/Update:**
1. Go to: https://github.com/jisaf/Hexhaven/settings/secrets/actions
2. Click "New repository secret" or click existing secret to update
3. Enter name and value
4. Click "Add secret" or "Update secret"

### Server Configuration Quick Reference

All other configuration is managed on the server via `/opt/hexhaven/.server-config`:

#### Server Configuration File

| Setting | Description | Example |
|---------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost:5432/hexhaven_production?schema=public` |
| `HOST` | Server bind address | `0.0.0.0` |
| `PORT` | Backend server port | `3000` |
| `CORS_ORIGIN` | CORS allowed origin | `http://150.136.88.138` |
| `FRONTEND_URL` | Frontend URL | `http://150.136.88.138` |
| `LOG_LEVEL` | Logging verbosity | `info`, `debug`, `warn`, `error` |
| `REDIS_URL` | Redis connection (optional) | `redis://localhost:6379` |
| `SENTRY_DSN` | Sentry error tracking (optional) | `https://key@sentry.io/project` |

**To Update Server Configuration:**
```bash
ssh hexhaven@150.136.88.138
/opt/hexhaven/server-config.sh update KEY "VALUE"
/opt/hexhaven/server-config.sh show  # Verify changes
```

**Auto-Generated Each Deployment:**
- `SESSION_SECRET` - Fresh session secret (auto-generated, 32-byte random)
- `NODE_ENV` - Always set to `production`
- `WS_PATH` - Always set to `/socket.io`

**Security Reminder:**
- Server configuration stays on the server (never in GitHub)
- Session secrets auto-rotate with each deployment
- Configuration file has 600 permissions
- Configuration backed up with each deployment

### Getting Help

1. Check this documentation
2. Review deployment logs in GitHub Actions
3. Check server logs: `sudo journalctl -u hexhaven-backend -n 100`
4. Review Nginx logs: `sudo tail -f /var/log/nginx/hexhaven-error.log`

---

**Last Updated:** 2025-11-13
**Maintained By:** DevOps Team
**Production URL:** http://150.136.88.138

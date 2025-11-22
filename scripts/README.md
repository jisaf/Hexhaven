# Deployment Scripts

This directory contains scripts for deploying and managing the Hexhaven application.

## Automatic Deployment (Recommended)

**Every pull request to `main` automatically triggers deployment** to production (129.213.88.197).

The GitHub Actions workflow (`.github/workflows/pr-deploy.yml`):
- Runs on PR creation and updates
- Runs in parallel with tests (non-blocking)
- Deploys via SSH to production server
- Verifies deployment health

No manual action needed - just create or update a PR targeting `main`.

## Production Deployment

### deploy-prod.sh

**Fresh deployment script for production server (129.213.88.197)**

Deploys the complete application to the production server via SSH.

**Usage:**
```bash
# Deploy using default SSH authentication
./scripts/deploy-prod.sh

# Deploy using a specific SSH key
./scripts/deploy-prod.sh /path/to/ssh-key
```

**What it does:**
1. Validates SSH connection to production server
2. Runs tests and linting locally
3. Builds frontend and backend
4. Creates deployment archive
5. Uploads archive to server via SCP
6. Extracts and deploys application on server
7. Configures Nginx, PM2, and firewall
8. Starts backend service with PM2
9. Verifies deployment health

**Environment Variables:**
- `PRODUCTION_HOST` - Production server IP (default: 129.213.88.197)
- `DEPLOY_USER` - SSH user (default: ubuntu)

## Server-Side Scripts

These scripts run on the production server after deployment:

### deploy.sh

Server-side deployment script that:
- Installs backend dependencies
- Runs database migrations (when enabled)
- Verifies builds
- Creates deployment info marker
- Cleans up old backups

**Note:** This script is called automatically by `deploy-to-production.sh`. You shouldn't need to run it manually.

### server-config.sh

Manages persistent server configuration at `/opt/hexhaven/.server-config`.

**Commands:**
```bash
# Initialize server configuration
./server-config.sh init

# Generate .env file from server config
./server-config.sh generate

# Show current configuration (passwords masked)
./server-config.sh show

# Update a configuration value
./server-config.sh update DATABASE_URL "postgresql://..."
```

**Managed Settings:**
- DATABASE_URL
- HOST, PORT
- CORS_ORIGIN
- FRONTEND_URL
- LOG_LEVEL
- REDIS_URL (optional)
- SENTRY_DSN (optional)

### network-diagnostics.sh

Comprehensive network diagnostics for Oracle Cloud deployments.

**Usage:**
```bash
ssh ubuntu@129.213.88.197
cd /opt/hexhaven
./scripts/network-diagnostics.sh
```

**Checks:**
- Server IP detection
- Port listening status
- Local connectivity
- iptables firewall rules
- Oracle Cloud Network Security Groups
- Public IP connectivity
- Service status
- Configuration files
- Recent logs

## Production Server Information

- **Server IP:** 129.213.88.197
- **Deploy User:** ubuntu
- **Deploy Path:** /opt/hexhaven
- **Frontend Path:** /var/www/hexhaven/frontend
- **Nginx Config:** /etc/nginx/sites-available/hexhaven
- **PM2 Process:** hexhaven-backend
- **Logs:** /opt/hexhaven/logs/

## Monitoring Commands

```bash
# SSH to production server
ssh ubuntu@129.213.88.197

# View PM2 status
pm2 status

# View backend logs
pm2 logs hexhaven-backend

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check service status
sudo systemctl status nginx
pm2 show hexhaven-backend

# Run network diagnostics
cd /opt/hexhaven && ./scripts/network-diagnostics.sh
```

## First-Time Server Setup

After the first deployment, configure Oracle Cloud Security List:

1. Go to: https://cloud.oracle.com
2. Navigate to: Networking → Virtual Cloud Networks
3. Select your VCN → Security Lists → Default Security List
4. Click "Add Ingress Rules"
5. Configure:
   - Source CIDR: 0.0.0.0/0
   - IP Protocol: TCP
   - Destination Port Range: 80
6. Click "Add Ingress Rules"

See `infrastructure/DEPLOYMENT.md` for detailed deployment documentation.

# GitHub Actions Workflows

## pr-deploy.yml

**Automatic deployment on pull requests to main**

### Trigger Events
- Pull request opened targeting `main`
- Pull request synchronized (updated) targeting `main`
- Pull request reopened targeting `main`

### What It Does
1. Runs tests and linting
2. Builds backend and frontend
3. Creates deployment archive
4. Uploads to production server (129.213.88.197) via SSH
5. Deploys and configures all services (Nginx, PM2, firewall)
6. Starts backend with PM2
7. Verifies deployment health

### Parallelization
This workflow runs in parallel with other workflows (like CI tests). It has no job dependencies and will not block other workflows.

### Required Secrets
- `PRODUCTION_SSH_KEY` - SSH private key for production server authentication
- `PRODUCTION_HOST` - Production server IP (defaults to 129.213.88.197 if not set)

### Configuration
The deployment uses these environment variables:
- `NODE_VERSION: '20'` - Node.js version
- `DEPLOY_USER: 'ubuntu'` - SSH user on production server
- `DEPLOY_PATH: '/opt/hexhaven'` - Deployment directory on server

### First-Time Setup
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

### Monitoring Deployments
- View deployment logs in GitHub Actions tab
- Check deployment status in PR checks
- Monitor application: http://129.213.88.197

### Troubleshooting
If deployment fails:
1. Check GitHub Actions logs for error details
2. Verify `PRODUCTION_SSH_KEY` secret is set correctly
3. Verify SSH access: `ssh ubuntu@129.213.88.197`
4. Check server logs: `ssh ubuntu@129.213.88.197 'pm2 logs hexhaven-backend'`
5. Run diagnostics: `ssh ubuntu@129.213.88.197 'cd /opt/hexhaven && ./scripts/network-diagnostics.sh'`

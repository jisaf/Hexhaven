# Deployment Guide for Hexhaven

## Quick Start - Production Deployment

### Automatic Deployment (Recommended)

**Every pull request to `main` automatically deploys to production** at 129.213.88.197.

The deployment:
- Runs automatically on PR creation and updates
- Runs in parallel with tests (non-blocking)
- Deploys via SSH to the production server
- Verifies deployment health

Simply create or update a PR targeting `main` and the deployment workflow will run automatically.

### Manual Deployment (Alternative)

You can also deploy manually using the SSH deployment script:

```bash
# Deploy using default SSH authentication (SSH key from ~/.ssh)
./scripts/deploy-to-production.sh

# Or specify a custom SSH key
./scripts/deploy-to-production.sh /path/to/your/ssh-key
```

**Prerequisites:**
- SSH access to the production server (129.213.88.197)
- SSH key added to the server's authorized_keys
- Node.js 20+ installed locally
- npm installed locally

**The script will:**
1. Run tests and linting
2. Build both frontend and backend
3. Create a deployment archive
4. Upload to the production server via SCP
5. Deploy and configure all services (Nginx, PM2)
6. Verify the deployment

**First-time Oracle Cloud Setup:**

After the first deployment, you need to configure Oracle Cloud Security List to allow HTTP traffic:

1. Go to: https://cloud.oracle.com
2. Navigate to: Networking → Virtual Cloud Networks
3. Select your VCN → Security Lists → Default Security List
4. Click "Add Ingress Rules"
5. Configure:
   - Source CIDR: 0.0.0.0/0
   - IP Protocol: TCP
   - Destination Port Range: 80
6. Click "Add Ingress Rules"

## Architecture Overview

Hexhaven uses a **decoupled architecture** designed for horizontal scalability:

- **Frontend**: Static files served directly by Nginx (CDN-ready)
- **Backend**: Stateless API servers that can scale independently
- **WebSocket**: Sticky sessions for real-time connections (can use Redis for shared state)

This separation allows:
- Independent scaling of frontend and backend
- Zero-downtime frontend deployments
- Easy CDN integration for global distribution
- Multiple backend instances behind a load balancer

## Server Setup on OCI Ampere A1

### Prerequisites
- Oracle Linux 8 on OCI Ampere A1 instance
- Node.js 20+ installed
- PostgreSQL 14+ installed and configured
- Firewall configured to allow HTTP/HTTPS traffic

### Required Services

#### 1. Nginx Installation and Configuration

```bash
# Install Nginx
sudo dnf install -y nginx

# Copy Nginx configuration
sudo cp infrastructure/nginx/hexhaven.conf /etc/nginx/conf.d/hexhaven.conf

# Test configuration
sudo nginx -t

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### 2. SELinux Configuration

Nginx needs permission to connect to upstream services:

```bash
# Allow Nginx to make network connections
sudo setsebool -P httpd_can_network_connect 1

# Verify the setting
sudo getsebool httpd_can_network_connect
```

#### 3. Firewall Configuration

```bash
# Ensure HTTP port is open
sudo firewall-cmd --add-port=80/tcp --permanent
sudo firewall-cmd --reload

# Remove any conflicting forward-port rules
sudo firewall-cmd --remove-rich-rule='rule family="ipv4" forward-port port="80" protocol="tcp" to-port="5173"'
sudo firewall-cmd --runtime-to-permanent
```

#### 4. Frontend Deployment

Use the automated deployment script:

```bash
# Deploy frontend to Nginx web root
./infrastructure/deploy-frontend.sh

# Or manually:
cd frontend
npm ci --production=false
npm run build
sudo mkdir -p /var/www/hexhaven/frontend
sudo cp -r dist /var/www/hexhaven/frontend/
sudo chown -R nginx:nginx /var/www/hexhaven
sudo chmod -R 755 /var/www/hexhaven
```

**Important**: After deploying frontend, reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Backend Service

The backend runs on port 3000. For production, use PM2 or systemd:

**Using PM2 (recommended):**
```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd backend
npm ci --production
npm run build
pm2 start npm --name "hexhaven-backend" -- run start:prod

# Configure PM2 to start on boot
pm2 startup
pm2 save
```

**Using systemd:**
```bash
# See infrastructure/systemd/hexhaven-backend.service for example
sudo systemctl enable hexhaven-backend
sudo systemctl start hexhaven-backend
```

### Service Architecture

**Production (current - single server):**
```
Internet (Port 80)
    ↓
Nginx (Static + Reverse Proxy)
    ├─→ / → Static Files (/var/www/hexhaven/frontend/dist) [Frontend]
    ├─→ /api → NestJS Server (Port 3000) [Backend API]
    └─→ /socket.io → NestJS Server (Port 3000) [WebSocket]
```

**Production (horizontal scaling):**
```
Internet (Port 80/443)
    ↓
Load Balancer (Nginx/HAProxy)
    ├─→ / → CDN or Static File Server [Frontend]
    ├─→ /api → Backend Pool (N instances)
    │            ├─→ Backend 1 (Port 3001)
    │            ├─→ Backend 2 (Port 3002)
    │            └─→ Backend N (Port 300N)
    └─→ /socket.io → Backend Pool (Sticky Sessions)
                     └─→ Redis for shared session state
```

### Development Architecture

For local development, run frontend and backend separately:

```bash
# Terminal 1: Frontend dev server (hot reload)
cd frontend && npm run dev  # Runs on localhost:5173

# Terminal 2: Backend dev server
cd backend && npm run dev   # Runs on localhost:3000

# Or use the monorepo command:
npm run dev  # Runs both concurrently
```

Access development server at: `http://localhost:5173`

### OCI Security Group Configuration

**IMPORTANT**: Ensure the OCI Security Group for your instance allows inbound traffic on port 80:

1. Log into OCI Console
2. Navigate to Networking → Virtual Cloud Networks
3. Select your VCN → Security Lists
4. Add Ingress Rule:
   - Source: 0.0.0.0/0 (or specific IP ranges)
   - Protocol: TCP
   - Destination Port: 80

### Troubleshooting

#### Nginx 502 Bad Gateway

Check if services are running:
```bash
# Check backend
curl http://localhost:3000

# Check frontend
curl http://localhost:5173
```

Check Nginx error logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

#### SELinux Permission Denied

If you see "Permission denied" in Nginx logs when connecting to upstream:
```bash
sudo setsebool -P httpd_can_network_connect 1
```

#### Port Already in Use

Check what's using the ports:
```bash
sudo netstat -tlnp | grep -E ':(80|3000|5173)'
```

### Monitoring

Check service status:
```bash
# Nginx
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check running Node processes
ps aux | grep node
```

### Production Deployment Checklist

- [ ] Nginx installed and configured
- [ ] SELinux permissions set
- [ ] Firewall rules configured
- [ ] OCI Security Groups allow port 80
- [ ] Backend service running on port 3000
- [ ] Frontend built and served (production mode)
- [ ] PostgreSQL database configured
- [ ] SSL/TLS certificates installed (Let's Encrypt)
- [ ] Process manager configured (PM2 recommended)
- [ ] Monitoring setup (Sentry)
- [ ] Backup procedures in place

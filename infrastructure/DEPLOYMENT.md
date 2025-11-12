# Deployment Guide for Hexhaven

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

#### 4. Backend Service

The backend runs on port 3000:

```bash
cd backend
npm install
npm run build
npm run start:prod
```

#### 5. Frontend Service (Development)

The frontend Vite dev server runs on port 5173:

```bash
cd frontend
npm install
npm run dev
```

For production, build and serve static files:

```bash
cd frontend
npm run build
# Serve the dist/ folder through Nginx or a static file server
```

### Service Architecture

```
Internet (Port 80)
    ↓
Nginx (Reverse Proxy)
    ├─→ / → Vite Dev Server (Port 5173) [Frontend]
    ├─→ /api → NestJS Server (Port 3000) [Backend API]
    └─→ /socket.io → NestJS Server (Port 3000) [WebSocket]
```

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

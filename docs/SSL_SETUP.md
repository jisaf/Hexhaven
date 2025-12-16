# SSL Certificate Setup

This guide explains how to set up SSL certificates for hexhaven servers using Let's Encrypt.

## Table of Contents
- [Automated Setup (GitHub Actions)](#automated-setup-github-actions)
- [Manual Setup (Script)](#manual-setup-script)
- [Manual Setup (Commands)](#manual-setup-commands)
- [Troubleshooting](#troubleshooting)

## Automated Setup (GitHub Actions)

### Prerequisites

Ensure the following GitHub secrets are configured in your repository:

| Secret Name | Description | Required For |
|------------|-------------|--------------|
| `PRODUCTION_SSH_KEY` | SSH private key for production server | Production |
| `DEV_SSH_KEY` | SSH private key for dev server | Development |
| `PRODUCTION_HOST` | Production server IP (default: 150.136.69.114) | Production |
| `DEV_HOST` | Dev server IP (default: 150.136.173.159) | Development |

### Running the Workflow

1. Go to your GitHub repository
2. Click on the **Actions** tab
3. Select **Setup SSL Certificates** workflow
4. Click **Run workflow**
5. Choose the server (prod or dev)
6. Optionally provide an email for certificate notifications
7. Click **Run workflow**

The workflow will:
- Install certbot on the target server
- Configure nginx for ACME challenges
- Obtain SSL certificates from Let's Encrypt
- Configure automatic HTTPS redirects
- Set up automatic certificate renewal

## Manual Setup (Script)

SSH into the target server and run:

```bash
cd /opt/hexhaven  # or wherever the repo is cloned
./scripts/setup-ssl.sh
```

Follow the interactive prompts to:
1. Select which domain to configure
2. Provide an email (optional) for renewal notifications
3. Confirm the setup

## Manual Setup (Commands)

### For Production (hexhaven.net)

```bash
# Install certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Create ACME challenge directory
sudo mkdir -p /var/www/html/.well-known/acme-challenge

# Ensure nginx config has ACME challenge location
# Add this to your nginx config before the location / block:
#   location /.well-known/acme-challenge/ {
#       root /var/www/html;
#   }

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx \
  -d hexhaven.net \
  -d www.hexhaven.net \
  --non-interactive \
  --agree-tos \
  --email your@email.com \
  --redirect

# Test auto-renewal
sudo certbot renew --dry-run
```

### For Development (dev.hexhaven.net)

```bash
# Install certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Create ACME challenge directory
sudo mkdir -p /var/www/html/.well-known/acme-challenge

# Ensure nginx config has ACME challenge location
# Add this to your nginx config before the location / block:
#   location /.well-known/acme-challenge/ {
#       root /var/www/html;
#   }

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx \
  -d dev.hexhaven.net \
  --non-interactive \
  --agree-tos \
  --email your@email.com \
  --redirect

# Test auto-renewal
sudo certbot renew --dry-run
```

## Certificate Auto-Renewal

Certbot automatically sets up a systemd timer for certificate renewal. Certificates will be renewed automatically before they expire.

To manually test renewal:
```bash
sudo certbot renew --dry-run
```

To force renewal:
```bash
sudo certbot renew --force-renewal
```

## Troubleshooting

### Issue: Connection Refused

**Symptoms:**
```
Certbot failed to authenticate some domains
Detail: Connection refused
```

**Solutions:**
1. Check if ports 80 and 443 are open:
   ```bash
   sudo ufw status
   ```

2. Check if nginx is running:
   ```bash
   sudo systemctl status nginx
   ```

3. Verify domain DNS points to the correct server:
   ```bash
   host yourdomain.com
   ```

### Issue: 502 Bad Gateway

**Symptoms:**
```
Detail: Invalid response from http://domain.com/.well-known/acme-challenge/...: 502
```

**Solutions:**
1. Check if backend services are running:
   ```bash
   ss -tlnp | grep -E '3000|3001|5173'
   ```

2. Temporarily set a static response for ACME challenges in nginx:
   ```nginx
   location /.well-known/acme-challenge/ {
       root /var/www/html;
   }
   ```

### Issue: Domain Not Resolving

**Solutions:**
1. Verify DNS records:
   ```bash
   dig yourdomain.com
   ```

2. Wait for DNS propagation (can take up to 48 hours)

3. Check if you're on the correct server:
   ```bash
   curl -H "Host: yourdomain.com" http://localhost/
   ```

### Issue: Certificate Already Exists

If you need to force renewal or re-issue:
```bash
sudo certbot --nginx -d yourdomain.com --force-renewal
```

To revoke and delete a certificate:
```bash
sudo certbot revoke --cert-name yourdomain.com
sudo certbot delete --cert-name yourdomain.com
```

## Checking Certificate Status

View all certificates:
```bash
sudo certbot certificates
```

Check certificate expiration:
```bash
sudo certbot certificates | grep -A 2 "Certificate Name"
```

View nginx SSL configuration:
```bash
sudo nginx -T | grep -A 10 "ssl_certificate"
```

## Security Best Practices

1. **Keep certificates up to date**: Certbot handles this automatically
2. **Monitor expiration**: Set up email notifications during SSL setup
3. **Use strong SSL protocols**: Ensure nginx uses TLSv1.2 and TLSv1.3 only
4. **Enable HSTS**: Add to nginx config:
   ```nginx
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
   ```

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://eff-certbot.readthedocs.io/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)

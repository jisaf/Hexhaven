/**
 * PM2 Ecosystem Configuration for Hexhaven Backend
 *
 * This file configures PM2 to run the Hexhaven backend in production.
 * It ensures proper environment variable loading and process management.
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 restart ecosystem.config.js --env production
 *   pm2 stop ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'hexhaven-backend',
      script: './backend/dist/backend/src/main.js',
      cwd: '/opt/hexhaven',
      // Preload dotenv BEFORE any modules load (fixes env var timing issue)
      node_args: '-r dotenv/config',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: '/opt/hexhaven/logs/pm2-error.log',
      out_file: '/opt/hexhaven/logs/pm2-out.log',
      log_file: '/opt/hexhaven/logs/pm2-combined.log',
      time: true,
      merge_logs: true,
    },
  ],
};

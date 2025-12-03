module.exports = {
  apps: [
    {
      name: 'hexhaven-backend',
      script: 'npm',
      args: 'run start:prod',
      cwd: '/home/opc/hexhaven/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/home/opc/hexhaven/logs/backend-error.log',
      out_file: '/home/opc/hexhaven/logs/backend-out.log',
      time: true,
    },
    {
      name: 'hexhaven-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: '/home/opc/hexhaven/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/home/opc/hexhaven/logs/frontend-error.log',
      out_file: '/home/opc/hexhaven/logs/frontend-out.log',
      time: true,
    },
  ],
};

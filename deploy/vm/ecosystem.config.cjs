/** PM2 config — path on VM: /home/pilotxpil/kidsapp/deploy/vm/ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: 'kidsquest-api',
      cwd: '/home/pilotxpil/kidsapp/server',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

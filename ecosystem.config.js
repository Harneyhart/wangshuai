module.exports = {
  apps: [
    {
      name: 'schwann-prod',
      script: 'pnpm run start -p 3600',

      // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
      // args: 'one two',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
    },
    {
      name: 'schwann-test',
      script: 'pnpm run start -p 3601',

      // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
      // args: 'one two',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
    },
  ],
};

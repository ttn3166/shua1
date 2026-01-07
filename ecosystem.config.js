module.exports = {
  apps: [
    {
      name: 'shua1-api',
      script: 'server/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};

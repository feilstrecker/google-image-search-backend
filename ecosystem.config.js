module.exports = {
  apps: [
    {
      name: 'google-image-search-backend',
      script: './dist/src/shared/infra/http/server.js',
      node_args: '--env-file=.env',
    },
  ],
};

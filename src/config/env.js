require('dotenv').config();

const required = ['AQUILINE_BASE_URL', 'AQUILINE_TOKEN_ID', 'AQUILINE_TOKEN_SECRET'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // Fail fast and loud on boot rather than surfacing cryptic auth errors later.
  // eslint-disable-next-line no-console
  console.error(`[env] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  aquiline: {
    baseUrl: process.env.AQUILINE_BASE_URL.replace(/\/+$/, ''),
    tokenId: process.env.AQUILINE_TOKEN_ID,
    tokenSecret: process.env.AQUILINE_TOKEN_SECRET,
    timeoutMs: parseInt(process.env.AQUILINE_TIMEOUT_MS, 10) || 15000,
  },
};

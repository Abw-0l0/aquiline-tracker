// Must run before src/config/env.js is required — it exits when these are missing.
// Values set here take precedence over .env (dotenv does not override).
process.env.AQUILINE_BASE_URL = 'https://aquiline.test/api/integration';
process.env.AQUILINE_TOKEN_ID = 'test-id';
process.env.AQUILINE_TOKEN_SECRET = 'test-secret';
process.env.LOG_LEVEL = 'error';

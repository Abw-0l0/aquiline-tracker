const winston = require('winston');
const { logLevel, nodeEnv } = require('../config/env');

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    nodeEnv === 'production'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  defaultMeta: { service: 'aquiline-sync-service' },
  transports: [new winston.transports.Console()],
});

module.exports = logger;

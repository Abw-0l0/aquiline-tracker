const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const stage = isAppError ? err.stage : 'unknown';

  logger.error('Request failed', {
    path: req.originalUrl,
    method: req.method,
    stage,
    statusCode,
    message: err.message,
    details: isAppError ? err.details : undefined,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    stage,
    error: err.message || 'Internal server error',
    details: isAppError ? err.details : undefined,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, stage: 'not_found', error: `Route not found: ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };

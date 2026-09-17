const express = require('express');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' })); // Amazon tracking HTML payloads can be sizeable

app.use((req, res, next) => {
  logger.info('Incoming request', { method: req.method, path: req.originalUrl });
  next();
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

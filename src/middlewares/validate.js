const AppError = require('../utils/AppError');

/**
 * Returns an Express middleware that validates `req[source]` against a Joi
 * schema. On failure, throws an AppError with stage "validation" (400),
 * caught by the central error handler — Aquiline is never called with bad input.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return next(
        new AppError('Validation failed', {
          stage: 'validation',
          statusCode: 400,
          details: error.details.map((d) => d.message),
        })
      );
    }
    req[source] = value;
    next();
  };
}

module.exports = validate;

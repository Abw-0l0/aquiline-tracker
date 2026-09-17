/**
 * Error carrying an HTTP status code and a "stage" label so callers/logs know
 * exactly which step of the flow failed (validation, check_profile,
 * create_profile, upsert_order, upload_html, get_tracking, assign_tracking).
 */
class AppError extends Error {
  constructor(message, { stage = 'unknown', statusCode = 500, details = undefined } = {}) {
    super(message);
    this.name = 'AppError';
    this.stage = stage;
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = AppError;

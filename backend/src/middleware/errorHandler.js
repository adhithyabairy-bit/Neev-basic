/**
 * Centralized Express Error Handling Middleware.
 * Catches all thrown or next(err) errors, formats Mongoose errors,
 * and ensures internal stack traces and secrets are never exposed in production.
 */
export function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'An unexpected server error occurred.';
  let code = err.code || 'SERVER_ERROR';
  let details = undefined;

  // Handle Mongoose Validation Errors (e.g. required fields, min marks)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const fields = {};
    for (const [field, errorObj] of Object.entries(err.errors)) {
      fields[field] = errorObj.message;
    }
    details = fields;
    message = Object.values(fields).join('; ') || 'Validation error.';
  }

  // Handle Mongoose CastError (e.g. invalid MongoDB ObjectId format)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID_FORMAT';
    message = `Invalid ID format for field '${err.path}': '${err.value}'`;
  }

  // Handle MongoDB Duplicate Key (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'record';
    message = `A record with this ${field} already exists.`;
  }

  // Handle JSON Syntax Errors in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'MALFORMED_JSON';
    message = 'Malformed JSON in request body.';
  }

  // Log error details for server diagnostics (excluding production sensitive logs)
  if (!isProduction) {
    console.error(`[Error ${statusCode} - ${req.method} ${req.originalUrl}]:`, err.message);
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(details ? { details } : {}),
    ...(!isProduction && err.stack ? { stack: err.stack } : {}),
  });
}

export default errorHandler;

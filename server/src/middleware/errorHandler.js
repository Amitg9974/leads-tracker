const { HttpError } = require('../utils/errors');

// Every error leaves the API in one shape: { error: { message, details? } }
function apiNotFound(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { message: err.message, ...(err.details && { details: err.details }) },
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Request body contains invalid JSON' } });
  }
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      error: { message: 'A lead with this email already exists', details: { email: 'Email is already in use' } },
    });
  }
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
}

module.exports = { apiNotFound, errorHandler };

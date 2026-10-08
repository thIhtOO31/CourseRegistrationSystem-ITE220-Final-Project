class AppError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// Forward async route errors to the error handler
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Return an error for unknown routes
function notFound(req, res) {
  res.status(404).json({
    message: "Route not found"
  });
}

// Send consistent API error messages
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      message: "Invalid JSON body"
    });
  }

  if (err && err.code === 11000) {
    return res.status(409).json({
      message: "Duplicate value already exists"
    });
  }

  if (err && err.name === "ValidationError") {
    const errors = Object.values(err.errors || {}).map(item => item.message);
    return res.status(400).json({
      message: "Validation failed",
      errors
    });
  }

  if (err instanceof AppError) {
    const body = {
      message: err.message
    };
    if (err.errors) body.errors = err.errors;
    return res.status(err.status).json(body);
  }

  console.error(err);
  return res.status(500).json({
    message: "Server error"
  });
}

module.exports = {
  AppError,
  asyncHandler,
  notFound,
  errorHandler
};
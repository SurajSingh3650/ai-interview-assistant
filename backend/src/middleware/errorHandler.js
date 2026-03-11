const { ZodError } = require("zod");
const env = require("../config/env");
const logger = require("../config/logger");

module.exports = function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_SERVER_ERROR";
  let message = err.message || "An unexpected error occurred";
  let details = err.details || null;

  if (err instanceof ZodError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Invalid request payload";
    details = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }));
  }

  logger.error("Request failed", {
    traceId: req.traceId,
    code,
    statusCode,
    message,
    path: req.originalUrl,
    method: req.method
  });

  const response = {
    error: {
      code,
      message,
      traceId: req.traceId
    }
  };

  if (details) {
    response.error.details = details;
  }

  if (env.NODE_ENV !== "production" && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

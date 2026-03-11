const { v4: uuidv4 } = require("uuid");

module.exports = function requestContext(req, res, next) {
  const traceId = req.header("x-trace-id") || uuidv4();
  req.traceId = traceId;
  res.setHeader("x-trace-id", traceId);
  next();
};

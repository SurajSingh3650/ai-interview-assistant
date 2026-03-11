const jwt = require("jsonwebtoken");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const { validateAccessClaims } = require("../modules/auth/sessionAuth");

module.exports = async function authGuard(req, _res, next) {
  const authHeader = req.header("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return next(new AppError(401, "AUTH_REQUIRED", "Missing bearer token"));
  }

  try {
    const claims = jwt.verify(token, env.JWT_SECRET);
    const { user } = await validateAccessClaims(claims);
    req.user = {
      ...claims,
      email: user.email,
      role: user.role || "candidate",
      name: user.name || null
    };
    return next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError(401, "INVALID_TOKEN", "Invalid or expired token"));
  }
};

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const {AppError, asyncHandler} = require("./error");

// Check the login token on protected routes
const authenticate = asyncHandler(
  async (req, res, next) => {
    const header = req.get("Authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!match) throw new AppError(401, "Authentication required");

    if (!process.env.JWT_SECRET) {
      throw new AppError(500, "Server authentication is not configured");
    }
    let payload;

    try {
      payload = jwt.verify(match[1], process.env.JWT_SECRET);
    } catch (error) {
      throw new AppError(401, "Invalid or expired token");
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.active) throw new AppError(401, "Invalid or expired token");

    req.user = user;
    next();
  }
);

// Limit access to the selected user roles
function allowRoles(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, "Access denied"));
    }
    next();
  };
}

module.exports = {authenticate, allowRoles};
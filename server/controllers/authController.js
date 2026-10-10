const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const { AppError, asyncHandler } = require("../middleware/error");
const { userSafe } = require("../utils/dto");

// Check credentials and create a login token
const login = asyncHandler(
  async (req, res) => {
    const {
      email,
      password
    } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      throw new AppError(400, "Email and password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    }).select("+passwordHash");

    const valid = user && user.active ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!valid) throw new AppError(401, "Invalid email or password");

    if (!process.env.JWT_SECRET) {
      throw new AppError(500, "Server authentication is not configured");
    }

    const token = jwt.sign({}, process.env.JWT_SECRET, {
      subject: String(user._id),
      expiresIn: "2h"
    });

    res.status(200).json({
      data: {
        token,
        user: userSafe(user)
      }
    });
  }
);

module.exports = {login};
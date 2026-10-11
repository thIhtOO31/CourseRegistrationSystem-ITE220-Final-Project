const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Registration = require("../models/Registration");
const Record = require("../models/Record");

const { AppError, asyncHandler } = require("../middleware/error");
const { assertObjectId, assertAllowedFields } = require("../utils/validation");
const { userSafe } = require("../utils/dto");
const { validateAccountIdentity } = require("../utils/accountEmail");

const ROLES = ["admin", "advisor", "student"];

// Check that an assigned advisor is active
async function requireActiveAdvisor(advisorId, session) {
  assertObjectId(advisorId, "advisor ID");
  const query = User.findOne({
    _id: advisorId,
    role: "advisor",
    active: true
  });

  const advisor = session ? await query.session(session) : await query;

  if (!advisor) throw new AppError(400, "advisorId must reference an active advisor");
  return advisor;
}

// Check account details before saving
function validateBaseInput(data, creating = false) {
  if (typeof data.name !== "string" || !data.name.trim()) throw new AppError(400, "name is required");
  if (typeof data.email !== "string" || !data.email.includes("@")) throw new AppError(400, "valid email is required");
  if (!ROLES.includes(data.role)) throw new AppError(400, "Invalid role");

  if (creating && (typeof data.password !== "string" || data.password.length < 8)) {
    throw new AppError(400, "password must be at least 8 characters");
  }

  if (data.role === "student" && (typeof data.studentId !== "string" || !data.studentId.trim())) {
    throw new AppError(400, "studentId is required for students");
  }

  const identityError = validateAccountIdentity({
    ...data,
    name: data.name.trim()
  });

  if (identityError) throw new AppError(400, identityError);
}

// Return university accounts for the admin
const listUsers = asyncHandler(
  async (req, res) => {
    const filter = {};

    if (req.query.role) {
      if (!ROLES.includes(req.query.role)) throw new AppError(400, "Invalid role filter");
      filter.role = req.query.role;
    }

    const users = await User.find(filter).sort({
      role: 1,
      name: 1
    });

    res.json({
      data: users.map(userSafe)
    });
  }
);

// Create a new user account
const createUser = asyncHandler(
  async (req, res) => {
    const allowed = ["name", "email", "role", "password", "studentId", "advisorId"];

    assertAllowedFields(req.body || {}, allowed);
    validateBaseInput(req.body, true);

    if (req.body.role === "student") await requireActiveAdvisor(req.body.advisorId);

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await User.create(
      {
        name: req.body.name.trim(),
        email: req.body.email.trim().toLowerCase(),
        passwordHash,
        role: req.body.role,
        studentId: req.body.role === "student" ? req.body.studentId.trim() : undefined,
        advisorId: req.body.role === "student" ? req.body.advisorId : undefined
      }
    );

    res.status(201).json({
      data: userSafe(user)
    });
  }
);

// Update account information
const updateUser = asyncHandler(
  async (req, res) => {
    assertObjectId(req.params.id, "user ID");

    const allowed = ["name", "email", "role", "studentId", "advisorId", "active"];

    assertAllowedFields(req.body || {}, allowed);

    if (!Object.keys(req.body || {}).length) throw new AppError(400, "No fields to update");

    const session = await mongoose.startSession();
    let result;
    try {
      await session.withTransaction(
        async () => {
          const acting = await User.findOneAndUpdate(
            {
              _id: req.user._id,
              role: "admin",
              active: true
            },
            {
              $inc: {
                writeVersion: 1
              }
            },
            {
              new: true,
              session
            }
          );

          if (!acting) throw new AppError(403, "Admin access is no longer valid");
          const target = await User.findById(req.params.id).session(session).select("+writeVersion");

          if (!target) throw new AppError(404, "User not found");
          const proposed = {
            name: req.body.name !== undefined ? req.body.name : target.name,
            email: req.body.email !== undefined ? req.body.email : target.email,
            role: req.body.role !== undefined ? req.body.role : target.role,
            studentId: req.body.studentId !== undefined ? req.body.studentId : target.studentId,
            advisorId: req.body.advisorId !== undefined ? req.body.advisorId : target.advisorId,
            active: req.body.active !== undefined ? req.body.active : target.active
          };

          validateBaseInput({
            ...proposed,
            password: "not-used"
          }, false);

          if (typeof proposed.active !== "boolean") throw new AppError(400, "active must be true or false");

          const isSelf = String(target._id) === String(acting._id);

          if (isSelf && (proposed.role !== "admin" || proposed.active === false)) {
            throw new AppError(409, "You cannot deactivate or demote your own admin account");
          }

          const removingAdmin = target.role === "admin" && (proposed.role !== "admin" || proposed.active === false);
          if (removingAdmin) {
            const activeAdmins = await User.countDocuments({
              role: "admin",
              active: true
            }).session(session);
            if (activeAdmins <= 1) throw new AppError(409, "The system must keep at least one active admin");
          }

          if (target.role === "advisor" && (proposed.role !== "advisor" || proposed.active === false)) {
            const assigned = await User.exists({
              role: "student",
              active: true,
              advisorId: target._id
            }).session(
              session
            );
            if (assigned) throw new AppError(409, "Reassign active students before changing or deactivating this advisor");
          }

          if (target.role === "student" && proposed.role !== "student") {
            const [hasRegistration, hasRecord] = await Promise.all(
              [
                Registration.exists({
                  studentId: target._id
                }).session(session),
                Record.exists({
                  studentId: target._id
                }).session(session)
              ]
            );
            if (hasRegistration || hasRecord) {
              throw new AppError(409, "A student with academic history must keep the student role");
            }
          }

          if (proposed.role === "student") await requireActiveAdvisor(proposed.advisorId, session);
          target.name = String(proposed.name).trim();
          target.email = String(proposed.email).trim().toLowerCase();
          target.role = proposed.role;
          target.active = proposed.active;
          target.studentId = proposed.role === "student" ? String(proposed.studentId).trim() : undefined;
          target.advisorId = proposed.role === "student" ? proposed.advisorId : undefined;
          await target.save({
            session
          });

          result = userSafe(target);
        }
      );
    } finally {
      await session.endSession();
    }

    res.json({data: result});
  }
);

// Delete or deactivate an account safely
const deleteUser = asyncHandler(
  async (req, res) => {
    assertObjectId(req.params.id, "user ID");

    const session = await mongoose.startSession();

    let result;
    try {
      await session.withTransaction(
        async () => {
          const acting = await User.findOneAndUpdate(
            {
              _id: req.user._id,
              role: "admin",
              active: true
            },
            {
              $inc: {
                writeVersion: 1
              }
            },
            {
              new: true,
              session
            }
          );

          if (!acting) throw new AppError(403, "Admin access is no longer valid");
          const target = await User.findById(req.params.id).session(session);
          if (!target) throw new AppError(404, "User not found");

          if (String(target._id) === String(acting._id)) {
            throw new AppError(409, "You cannot delete your own admin account");
          }

          if (target.role === "admin") {
            const activeAdmins = await User.countDocuments({
              role: "admin",
              active: true
            }).session(session);
            if (target.active && activeAdmins <= 1) throw new AppError(409, "The system must keep at least one active admin");
          }

          if (target.role === "advisor") {
            const assigned = await User.exists({
              role: "student",
              active: true,
              advisorId: target._id
            }).session(
              session
            );
            if (assigned) throw new AppError(409, "Reassign active students before removing this advisor");
          }
          const [hasRegistration, hasRecord, isAdvisorReference] = await Promise.all(
            [
              Registration.exists({
                studentId: target._id
              }).session(session),
              Record.exists({
                studentId: target._id
              }).session(session),
              User.exists({
                advisorId: target._id
              }).session(session)
            ]
          );

          if (hasRegistration || hasRecord || isAdvisorReference) {
            target.active = false;
            await target.save({
              session
            });
            result = {
              _id: String(target._id),
              action: "deactivated",
              message: "User was deactivated to preserve referenced history"
            };
          } else {
            await User.deleteOne({
              _id: target._id
            }).session(session);
            result = {
              _id: String(target._id),
              action: "deleted",
              message: "User deleted"
            };
          }
        }
      );
    } finally {
      await session.endSession();
    }
    res.json({data: result});
  }
);

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser
};
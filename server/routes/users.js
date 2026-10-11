// Set up admin account management routes
const express = require("express");
const { authenticate, allowRoles } = require("../middleware/auth");
const { listUsers, createUser, updateUser, deleteUser } = require("../controllers/userController");

const router = express.Router();
router.use(authenticate, allowRoles("admin"));
router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);
module.exports = router;
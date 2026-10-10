// Set up advisor registration routes
const express = require("express");
const { authenticate, allowRoles } = require("../middleware/auth");
const { createRegistrations, dropRegistration } = require("../controllers/registrationController");

const router = express.Router();
router.use(authenticate, allowRoles("advisor"));
router.post("/", createRegistrations);
router.delete("/:id", dropRegistration);
module.exports = router;
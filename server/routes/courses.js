// Set up routes to view and create courses
const express = require("express");
const { authenticate, allowRoles } = require("../middleware/auth");
const { listCourses } = require("../controllers/offeringController");
const { createCourse } = require("../controllers/courseController");

const router = express.Router();
router.get("/", authenticate, allowRoles("advisor", "admin"), listCourses);
router.post("/", authenticate, allowRoles("admin"), createCourse);
module.exports = router;
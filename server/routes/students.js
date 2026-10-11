// Set up student record and enrollment routes
const express = require("express");
const { authenticate, allowRoles } = require("../middleware/auth");
const {
  listStudents,
  getStudentRecord,
  getEligible,
  getStudentRegistrations,
  getMyRegistrations,
  getMyRecord,
} = require("../controllers/studentController");

const router = express.Router();
router.get("/students", authenticate, allowRoles("advisor"), listStudents);
router.get("/students/:id/record", authenticate, allowRoles("advisor", "student"), getStudentRecord);
router.get("/students/:id/eligible", authenticate, allowRoles("advisor"), getEligible);
router.get("/students/:id/registrations", authenticate, allowRoles("advisor"), getStudentRegistrations);
router.get("/me/registrations", authenticate, allowRoles("student"), getMyRegistrations);
router.get("/me/record", authenticate, allowRoles("student"), getMyRecord);
module.exports = router;
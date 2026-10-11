// Set up the course section routes
const express = require("express");
const { authenticate, allowRoles } = require("../middleware/auth");
const { listOfferings, createOffering, updateOffering, deleteOffering } = require("../controllers/offeringController");

const router = express.Router();
router.use(authenticate);
router.get("/", allowRoles("advisor", "student"), listOfferings);
router.post("/", allowRoles("advisor"), createOffering);
router.patch("/:id", allowRoles("advisor"), updateOffering);
router.delete("/:id", allowRoles("advisor"), deleteOffering);
module.exports = router;
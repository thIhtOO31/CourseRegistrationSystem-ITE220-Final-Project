const mongoose = require("mongoose");
const {
  AppError
} = require("../middleware/error");
const TERM_RE = /^\d{4}-[1-3]$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// Validate a MongoDB record ID.
function assertObjectId(value, label = "ID") {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(400, `Invalid ${label}`);
  }
}
// Check the academic term format.
function assertTerm(term) {
  if (typeof term !== "string" || !TERM_RE.test(term)) {
    throw new AppError(400, "Invalid term. Use YYYY-1, YYYY-2 or YYYY-3");
  }
}
// Convert a time into minutes.
function toMinutes(value) {
  if (!TIME_RE.test(value || "")) return NaN;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
// Reject fields that are not allowed.
function assertAllowedFields(body, allowed) {
  const unknown = Object.keys(body || {}).filter(key => !allowed.includes(key));
  if (unknown.length) {
    throw new AppError(400, "Unknown fields are not allowed", unknown);
  }
}
module.exports = {
  TERM_RE,
  TIME_RE,
  assertObjectId,
  assertTerm,
  toMinutes,
  assertAllowedFields
};
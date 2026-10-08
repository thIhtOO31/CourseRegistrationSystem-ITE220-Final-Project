// Define student registrations for course sections
const mongoose = require("mongoose");

const {  TERM_RE } = require("../utils/validation");

const registrationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  offeringId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offering",
    required: true,
    index: true
  },
  term: {
    type: String,
    required: true,
    match: TERM_RE,
    index: true
  },
  status: {
    type: String,
    enum: ["registered", "dropped"],
    default: "registered",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

registrationSchema.index({
  studentId: 1,
  offeringId: 1
}, {
  unique: true
});

module.exports = mongoose.model("Registration", registrationSchema);
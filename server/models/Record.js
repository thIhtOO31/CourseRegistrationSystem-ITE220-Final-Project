// Define the student academic record
const mongoose = require("mongoose");

const { TERM_RE } = require("../utils/validation");

const recordSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
    index: true
  },
  term: {
    type: String,
    required: true,
    match: TERM_RE
  },
  grade: {
    type: String,
    required: true,
    enum: ["A", "B+", "B", "C+", "C", "D+", "D", "F", "W"]
  }
});

recordSchema.index({
  studentId: 1,
  courseId: 1,
  term: 1
}, {
  unique: true
});

module.exports = mongoose.model("Record", recordSchema);
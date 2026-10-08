// Define the section schedule, instructor, and enrollment limits
const mongoose = require("mongoose");

const { TERM_RE, TIME_RE, toMinutes } = require("../utils/validation");

const offeringSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  term: {
    type: String,
    required: true,
    match: TERM_RE
  },
  section: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: "section must be an integer"
    }
  },
  day: {
    type: String,
    required: true,
    enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  },
  startTime: {
    type: String,
    required: true,
    match: TIME_RE
  },
  endTime: {
    type: String,
    required: true,
    match: TIME_RE
  },
  room: {
    type: String,
    required: true,
    trim: true
  },
  instructor: {
    type: String,
    required: true,
    trim: true
  },
  instructorEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: "",
    validate: {
      validator: value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: "Invalid instructor email"
    }
  },
  seats: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: "seats must be an integer"
    }
  },
  seatsTaken: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: "seatsTaken must be an integer"
    }
  },
  addDropOpen: {
    type: Boolean,
    default: false
  },
  addDropClosesAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

offeringSchema.index({
  courseId: 1,
  term: 1,
  section: 1
}, {
  unique: true
});

offeringSchema.pre(
  "validate",
  function validateCrossFields(next) {
    if (TIME_RE.test(this.startTime || "") && TIME_RE.test(this.endTime || "")) {
      if (toMinutes(this.endTime) <= toMinutes(this.startTime)) {
        this.invalidate("endTime", "endTime must be later than startTime");
      }
    }
    if (Number.isFinite(this.seats) && Number.isFinite(this.seatsTaken) && this.seatsTaken > this.seats) {
      this.invalidate("seatsTaken", "seatsTaken cannot exceed seats");
    }
    next();
  }
);

module.exports = mongoose.model("Offering", offeringSchema);
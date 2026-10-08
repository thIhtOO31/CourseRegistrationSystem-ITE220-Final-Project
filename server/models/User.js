// Define account roles and student details
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    required: true,
    enum: ["admin", "advisor", "student"]
  },
  studentId: {
    type: String,
    trim: true
  },
  advisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  active: {
    type: Boolean,
    default: true
  },
  writeVersion: {
    type: Number,
    default: 0,
    min: 0,
    select: false
  }
}, {
  timestamps: true
});

userSchema.pre(
  "validate",
  function validateStudentFields(next) {
    if (this.role === "student") {
      if (!this.studentId) this.invalidate("studentId", "studentId is required for students");
      if (!this.advisorId) this.invalidate("advisorId", "advisorId is required for students");
    } else {
      this.studentId = undefined;
      this.advisorId = undefined;
    }
    next();
  }
);

userSchema.index(
  {
    studentId: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      studentId: {
        $type: "string"
      }
    }
  }
);

function hidePrivate(doc, ret) {
  delete ret.passwordHash;
  delete ret.writeVersion;
  delete ret.__v;
  return ret;
}

userSchema.set("toJSON", {
  transform: hidePrivate
});

userSchema.set("toObject", {
  transform: hidePrivate
});

module.exports = mongoose.model("User", userSchema);
// Define the information saved for each course
const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  credits: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: "credits must be an integer"
    },
    min: 1
  },
  description: {
    type: String,
    trim: true,
    default: ""
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Course", courseSchema);
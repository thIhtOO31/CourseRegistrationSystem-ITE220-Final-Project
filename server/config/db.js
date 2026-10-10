const mongoose = require("mongoose");

// Connect the application to MongoDB
async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
}

module.exports = connectDB;
const path = require("path");
const dns = require("dns");

dns.setServers([
  '1.1.1.1', '8.8.8.8'
]);

require("dotenv").config({path: path.join(__dirname, ".env")});

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const offeringRoutes = require("./routes/offerings");
const courseRoutes = require("./routes/courses");
const studentRoutes = require("./routes/students");
const registrationRoutes = require("./routes/registrations");

const {notFound, errorHandler} = require("./middleware/error");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({origin: CLIENT_URL}));
app.use(express.json());
app.get("/api/health", (req, res) => res.json({
  status: "ok"
}));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/offerings", offeringRoutes);
app.use("/api", studentRoutes);
app.use("/api/registrations", registrationRoutes);
app.use(notFound);
app.use(errorHandler);

// Connect to the database before starting the API
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = app;
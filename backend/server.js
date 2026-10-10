
const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const path = require("path");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const riskRoutes = require("./routes/riskRoutes");

dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3000;

// Required middleware
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

// Session configuration
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from the root .env file.");
}

app.use(
  session({
    name: "cyber.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60
    }
  })
);

// Serve your existing frontend
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// Home page
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// New authentication endpoints:
// POST /api/auth/register
// POST /api/auth/login
// GET  /api/auth/me
// POST /api/auth/logout
app.use("/api/auth", authRoutes);

// Protect the existing risk management API
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      message: "Please log in to access risk management."
    });
  }

  next();
}

app.use("/api/risks", requireLogin, riskRoutes);

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Cyber Risk Dashboard server is running."
  });
});

// Handle unknown API endpoints
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

// Start only after MongoDB connects
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("Cyber Risk Dashboard server started!");
      console.log(`Open http://localhost:${PORT}`);
      console.log(`Risk API: http://localhost:${PORT}/api/risks`);
    });
  } catch (error) {
    console.error("Could not start the server:", error.message);
    process.exit(1);
  }
}

startServer();

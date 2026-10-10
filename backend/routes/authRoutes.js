
const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." }
});

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Please log in first." });
  }
  next();
}

// Public registration: new accounts are always regular users.
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({ message: "Enter username, email and password." });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ message: "Username must be 3–30 characters." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (password.length < 10 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        message: "Password must be at least 10 characters and no more than 72 UTF-8 bytes."
      });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      role: "user"
    });

    return res.status(201).json({
      message: "Account created. You can now log in.",
      user: { username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "That email is already registered." });
    }
    console.error("Registration error:", error.message);
    return res.status(500).json({ message: "Could not create account." });
  }
});

// Limit repeated login attempts.
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Enter email and password." });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not start login session." });
      }

      req.session.user = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          return res.status(500).json({ message: "Could not save login session." });
        }

        return res.json({
          message: "Login successful.",
          user: req.session.user
        });
      });
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Login failed." });
  }
});

// Check current login.
router.get("/me", requireLogin, (req, res) => {
  res.json({ user: req.session.user });
});

// Log out and destroy the session.
router.post("/logout", requireLogin, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Could not log out." });
    }

    res.clearCookie("cyber.sid");
    return res.json({ message: "Logged out successfully." });
  });
});

module.exports = router;

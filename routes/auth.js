const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");

const router = express.Router();

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      timezone = "UTC",
      first_name,
      last_name,
      username,
      phone,
    } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: "Invalid email format" });

    if (password.length < 8)
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Email already in use" });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users
         (email, password_hash, timezone, first_name, last_name, username, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, email, timezone, first_name, last_name, username`,
      [
        email.toLowerCase().trim(),
        password_hash,
        timezone,
        first_name || null,
        last_name || null,
        username || null,
        phone || null,
      ],
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({ token, user });
  } catch (error) {
    req.log.error(error, "Registration failed");
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);

    // Constant-time compare even when user not found — prevents timing attacks
    const dummyHash =
      "$2b$10$invalidhashfortimingprotection000000000000000000000000";
    const user = result.rows[0] || { password_hash: dummyHash };
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!result.rows[0] || !valid)
      return res.status(401).json({ error: "Invalid credentials" });

    await pool.query("UPDATE users SET last_active_at = now() WHERE id = $1", [
      user.id,
    ]);

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        timezone: user.timezone,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
      },
    });
  } catch (error) {
    req.log.error(error, "Login failed");
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;

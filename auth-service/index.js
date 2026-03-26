// index.js
const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

app.use(express.json());
app.use(cookieParser());

require("dotenv").config();
const pool = require("./db");

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ 1. Input validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // ✅ 2. Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // ✅ 3. Hash password
    const hashed = await bcrypt.hash(password, 10);

    // ✅ 4. Insert user
    await pool.query("INSERT INTO users (email, password) VALUES ($1, $2)", [
      email,
      hashed,
    ]);

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("Register Error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  if (user.rows.length === 0) {
    return res.status(400).json({ message: "User not found" });
  }

  const valid = await bcrypt.compare(password, user.rows[0].password);
  if (!valid) {
    return res.status(400).json({ message: "Invalid password" });
  }

  const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, {
    expiresIn: "1h"
  });
  res.cookie("token", token, {
    httpOnly: true,
    maxAge: 60 * 60 * 1000,
  });

  res.json({ message: "Login success" });
});

app.get("/me", (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Not logged in" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ userId: decoded.userId });
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
});


app.get("/health", (req, res) => {
  res.send("OK");
});

app.use((req, res, next) => {
  console.log("Incoming request:", req.method, req.url);
  next();
});


const PORT = process.env.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Running on port ${PORT}`);
});
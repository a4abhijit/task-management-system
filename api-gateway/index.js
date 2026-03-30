const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://task-frontend-abhi-123.s3-website.eu-north-1.amazonaws.com",
    ],
    credentials: true,
  }),
);
app.options("*", cors());


app.use((req, res, next) => {
  console.log("Gateway hit:", req.method, req.url);
  next();
});

const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  console.log("👉 Auth middleware hit");

  if (!token) {
     console.log("❌ No token");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token valid:", decoded);
    req.headers["x-user-id"] = decoded.userId;

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

app.use(
  "/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
  }),
);

// Step 1: apply auth first
app.use("/tasks", authMiddleware);

// Step 2: then proxy separately
app.use(
  "/tasks",
  createProxyMiddleware({
    target: process.env.TASK_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/tasks": "",
    },
    logLevel: "debug",
  }),
);

app.get("/health", (req, res) => {
  res.send("OK");
});



const PORT = process.env.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Running on port ${PORT}`);
});

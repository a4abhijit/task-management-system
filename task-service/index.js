// index.js
const express = require("express");
const app = express();
require("dotenv").config();
const pool = require("./db");
const { producer, connectProducer } = require("./kafka");

app.use(express.json());

let kafkaAvailable = true;

const initKafka = async () => {
  try {
    await connectProducer();
    console.log("✅ Kafka connected");
  } catch (err) {
    console.log("❌ Kafka not available, continuing without it");
    kafkaAvailable = false;
  }
};

initKafka();

app.use((req, res, next) => {
  console.log("📥 Task service hit:", req.method, req.url);
  next();
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.post("/t1", async (req, res) => {
  const userId = req.headers["x-user-id"];
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Title required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *",
      [title, userId],
    );

    res.status(201).json(result.rows[0]);

    // Kafka event (keep this)
    try {
     if (kafkaAvailable) {
       await producer.send({
         topic: "task-created",
         messages: [{ value: JSON.stringify({ userId, title }) }],
       });
     }
    } catch (err) {
      console.log("Kafka skipped");
    }
  } catch (err) {
    console.error("Task creation error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

app.get("/t1", async (req, res) => {
  const userId = req.headers["x-user-id"];

  try {
    const result = await pool.query(
      "SELECT * FROM tasks WHERE user_id=$1 ORDER BY created_at DESC",
      [userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandled error:", err.message);
});

const PORT = process.env.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Running on port ${PORT}`);
});

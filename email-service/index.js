const express = require("express");
const app = express();
require("dotenv").config();

const { connectConsumer } = require("./kafka");

app.use(express.json());

const initKafka = async () => {
  try {
    await connectConsumer();
  } catch (err) {
    console.log("❌ Kafka not available for email-service");
  }
};

initKafka();

app.get("/health", (req, res) => {
  res.send("OK");
});

const PORT = process.env.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Running on port ${PORT}`);
});

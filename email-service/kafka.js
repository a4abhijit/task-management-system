const { Kafka } = require("kafkajs");
const sendEmail = require("./email");
require("dotenv").config();

const kafka = new Kafka({
  clientId: "email-service",
  brokers: [process.env.KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: "email-group" });

const connectConsumer = async () => {
  await consumer.connect();
  console.log("✅ Kafka connected (email-service)");

  await consumer.subscribe({ topic: "task-created", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value.toString());

      console.log("📧 Sending email for task:", data);

      const html = `
        <h2>Task Created ✅</h2>
        <p>Your task "<b>${data.title}</b>" was created successfully.</p>
      `;

      try {
        await sendEmail({
          to: process.env.EMAIL_USER,
          subject: "Task Created",
          html,
        });
        console.log("✅ Email sent");
      } catch (err) {
        console.error("❌ Email failed:", err.message);
      }
    },
  });
};

module.exports = { connectConsumer };

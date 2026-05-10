const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const queueRoutes = require("./routes/queueRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ message: "Virtual Q backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api", queueRoutes);

module.exports = app;

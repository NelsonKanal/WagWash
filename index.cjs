
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || true
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Wag & Wash backend is running!"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Wag & Wash backend running on port ${PORT}`);
});

import express from "express";
import dotenv from "dotenv";
import { authHero } from "./apis/hero.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Authentication endpoint
app.get("/auth", async (_req, res) => {
  try {
    const authData = await authHero(
      "info@heroeld.com",
      "Bishkek1pass2000!$",
      null
    );

    res.json({
      success: true,
      token: authData.accessToken || authData.token,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message || "Authentication failed"
    });
  }
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Authentication endpoint: POST http://localhost:${PORT}/auth`);
});





/**
 * Poricito Bazar — Express Backend Server v3.0 (Vercel Edition)
 */
"use strict";

require("dotenv").config();

const express       = require("express");
const cors          = require("cors");
const path          = require("path");
const productRoutes = require("./src/routes/productRoutes");
const orderRoutes   = require("./src/routes/orderRoutes");
const userRoutes    = require("./src/routes/userRoutes");
const pool          = require("./src/config/db");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(",").map((o) => o.trim())
    : true,
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.set("trust proxy", 1);

// ── Static files (local dev only — Vercel handles these via CDN) ─
// In production Vercel's @vercel/static build serves public/** directly.
// We still keep this so `npm run dev` works locally.
app.use(express.static(path.join(__dirname, "public")));

// ── API routes ──────────────────────────────────────────────────
app.use("/api", userRoutes);
app.use("/api", productRoutes);
app.use("/api", orderRoutes);

// ── Health check ────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ success: true, status: "ok", database: "connected", uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ success: false, status: "degraded", error: err.message });
  }
});

// ── 404 for unknown /api/* ──────────────────────────────────────
app.use("/api/*", (_req, res) =>
  res.status(404).json({ success: false, message: "রুট পাওয়া যায়নি।" })
);

// ── Global error handler ────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[Error]", err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "সার্ভার ত্রুটি।" : err.message,
  });
});

// ── SPA fallback — serve index.html for non-API routes ─────────
app.get("*", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

// ── Start server (local dev only) ──────────────────────────────
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log("\n╔══════════════════════════════════════════════════╗");
    console.log("║      পরিচিত বাজার — Backend Server v3.0         ║");
    console.log("╚══════════════════════════════════════════════════╝");
    console.log(`  🌐  http://localhost:${PORT}`);
    console.log(`  ❤️   http://localhost:${PORT}/api/health\n`);
  });

  const shutdown = (sig) => {
    console.log(`\n📴 ${sig} — বন্ধ হচ্ছে...`);
    server.close(async () => {
      try { await pool.end(); } catch {}
      process.exit(0);
    });
  };
  process.on("SIGINT",  () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

// ── Export for Vercel serverless ────────────────────────────────
module.exports = app;

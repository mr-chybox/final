/**
 * src/config/db.js
 * ─────────────────────────────────────────────────────────────
 * PostgreSQL pool — supports both DATABASE_URL (Vercel/Supabase/Neon)
 * and individual DB_* environment variables (local development).
 * ─────────────────────────────────────────────────────────────
 */
"use strict";

const { Pool } = require("pg");

// ── Build pool config ─────────────────────────────────────────
// Priority: DATABASE_URL (Vercel / hosted DB) > individual vars (local)
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      // SSL is required by Neon, Supabase, Railway, etc.
      ssl: { rejectUnauthorized: false },
      // Serverless: keep pool small — each function instance is short-lived
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    }
  : {
      host:     process.env.DB_HOST     || "localhost",
      port:     parseInt(process.env.DB_PORT || "5432", 10),
      database: process.env.DB_NAME     || "poricito_bazar",
      user:     process.env.DB_USER     || "postgres",
      password: process.env.DB_PASSWORD || "",
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    };

const pool = new Pool(poolConfig);

// ── Optional query logging (set DB_LOGGING=true in .env) ────
if (process.env.DB_LOGGING === "true") {
  const originalQuery = pool.query.bind(pool);
  pool.query = (...args) => {
    const sql = typeof args[0] === "string" ? args[0] : args[0].text;
    console.log("[DB]", sql.replace(/\s+/g, " ").trim());
    return originalQuery(...args);
  };
}

// ── Connectivity check (runs once at startup / first import) ─
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌  PostgreSQL সংযোগ ব্যর্থ হয়েছে:", err.message);
    console.error(
      "    DATABASE_URL অথবা DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD চেক করুন।"
    );
    return;
  }
  client.query("SELECT NOW()", (qErr, result) => {
    release();
    if (qErr) {
      console.error("❌  DB ping ব্যর্থ:", qErr.message);
    } else {
      console.log(
        `✅  PostgreSQL সংযুক্ত — সার্ভার সময়: ${result.rows[0].now}`
      );
    }
  });
});

// ── Graceful shutdown helper ─────────────────────────────────
pool.end_gracefully = () =>
  pool.end().then(() => console.log("🔌  PostgreSQL pool বন্ধ হয়েছে।"));

module.exports = pool;

/**
 * src/controllers/adminController.js
 * ─────────────────────────────────────────────────────────────
 * Handles admin login and token refresh.
 *
 * Security notes:
 *  - Credentials are stored in .env (never in source code).
 *  - Passwords are compared with a constant-time function to
 *    prevent timing attacks.
 *  - The JWT is signed with a strong secret from .env.
 *  - Failed login attempts are logged (extend with rate-limiting
 *    in production via express-rate-limit).
 * ─────────────────────────────────────────────────────────────
 */

"use strict";

const crypto              = require("crypto");
const { generateToken }   = require("../middleware/auth");

// ─────────────────────────────────────────────────────────────
// POST /api/admin/login
// Body: { username: "admin", password: "secret" }
// ─────────────────────────────────────────────────────────────
const login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "ব্যবহারকারীর নাম এবং পাসওয়ার্ড আবশ্যক।",
    });
  }

  // ── Load credentials from environment ────────────────────────
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error("❌  ADMIN_USERNAME বা ADMIN_PASSWORD .env ফাইলে নেই।");
    return res.status(500).json({
      success: false,
      message: "সার্ভার কনফিগারেশনে সমস্যা আছে।",
    });
  }

  // ── Constant-time comparison to prevent timing attacks ────────
  // We pad both strings to the same length before comparing so that
  // an attacker cannot infer partial matches from response time.
  const isUsernameMatch = safeEqual(username, ADMIN_USERNAME);
  const isPasswordMatch = safeEqual(password, ADMIN_PASSWORD);

  if (!isUsernameMatch || !isPasswordMatch) {
    // Log the failed attempt (IP, timestamp) — useful for monitoring
    console.warn(
      `⚠️  ব্যর্থ লগইন প্রচেষ্টা | IP: ${req.ip} | সময়: ${new Date().toISOString()}`
    );
    return res.status(401).json({
      success: false,
      message: "ব্যবহারকারীর নাম বা পাসওয়ার্ড ভুল।",
    });
  }

  // ── Issue JWT ─────────────────────────────────────────────────
  const token = generateToken({
    username: ADMIN_USERNAME,
    role:     "admin",
  });

  console.log(`✅  অ্যাডমিন লগইন সফল | IP: ${req.ip} | সময়: ${new Date().toISOString()}`);

  res.json({
    success:   true,
    message:   "লগইন সফল হয়েছে।",
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    admin: {
      username: ADMIN_USERNAME,
      role:     "admin",
    },
  });
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/me  (protected — requires valid JWT)
// Returns the currently authenticated admin's info.
// ─────────────────────────────────────────────────────────────
const getMe = (req, res) => {
  // req.admin is attached by the requireAdmin middleware
  res.json({
    success: true,
    data:    req.admin,
  });
};

// ─────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * safeEqual — constant-time string comparison.
 * Uses Node's crypto.timingSafeEqual on Buffer representations
 * so the comparison time does not leak information about how
 * many characters matched.
 */
function safeEqual(a, b) {
  try {
    // Both buffers must be the same byte length for timingSafeEqual.
    // We hash both inputs first so length differences don't matter.
    const bufA = crypto.createHash("sha256").update(a).digest();
    const bufB = crypto.createHash("sha256").update(b).digest();
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

module.exports = { login, getMe };

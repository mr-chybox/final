/**
 * src/middleware/auth.js
 * JWT middleware for BOTH admin and regular user routes.
 */
"use strict";

const jwt = require("jsonwebtoken");

/* ── Token generators ──────────────────────────────────────── */
const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    issuer:    "poricito-bazar",
  });

const generateUserToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, name: user.full_name, role: "user" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_USER_EXPIRES_IN || "30d", issuer: "poricito-bazar" }
  );

/* ── Admin middleware ──────────────────────────────────────── */
const requireAdmin = (req, res, next) => {
  const header = req.headers["authorization"] || "";
  if (!header.startsWith("Bearer "))
    return res.status(401).json({ success: false, message: "অ্যাক্সেস অস্বীকৃত। টোকেন দিন।" });

  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ success: false, message: "শুধুমাত্র অ্যাডমিনের জন্য।" });
    req.admin = decoded;
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError"
      ? "টোকেনের মেয়াদ শেষ। পুনরায় লগইন করুন।"
      : "অবৈধ টোকেন।";
    res.status(err.name === "TokenExpiredError" ? 401 : 403).json({ success: false, message: msg });
  }
};

/* ── User middleware ───────────────────────────────────────── */
const requireUser = (req, res, next) => {
  const header = req.headers["authorization"] || "";
  if (!header.startsWith("Bearer "))
    return res.status(401).json({ success: false, message: "লগইন করুন।" });

  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError"
      ? "সেশনের মেয়াদ শেষ। পুনরায় লগইন করুন।"
      : "অবৈধ টোকেন।";
    res.status(err.name === "TokenExpiredError" ? 401 : 403).json({ success: false, message: msg });
  }
};

/* ── Optional user (attach if token present, don't block) ─── */
const optionalUser = (req, res, next) => {
  const header = req.headers["authorization"] || "";
  if (header.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    } catch {}
  }
  next();
};

module.exports = { requireAdmin, requireUser, optionalUser, generateToken, generateUserToken };

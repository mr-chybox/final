/**
 * src/controllers/userController.js
 * ─────────────────────────────────────────────────────────────
 * Handles customer registration, login, profile, and
 * viewing their own order history.
 * ─────────────────────────────────────────────────────────────
 */
"use strict";

const bcrypt               = require("bcryptjs");
const pool                 = require("../config/db");
const { generateUserToken } = require("../middleware/auth");

// Rounds for bcrypt (12 = strong but still fast on modern hardware)
const SALT_ROUNDS = 12;

/* ── Safe user DTO (never return password_hash) ─────────────── */
const toUserDTO = (row) => ({
  id:         row.id,
  fullName:   row.full_name,
  email:      row.email,
  phone:      row.phone,
  address:    row.address,
  district:   row.district,
  thana:      row.thana,
  isVerified: row.is_verified,
  createdAt:  row.created_at,
  lastLogin:  row.last_login_at,
});

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/register
   Body: { fullName, email, password, phone? }
──────────────────────────────────────────────────────────────── */
const register = async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    // ── Validate ───────────────────────────────────────────────
    if (!fullName || !email || !password)
      return res.status(400).json({ success: false, message: "নাম, ইমেইল ও পাসওয়ার্ড আবশ্যক।" });

    if (password.length < 6)
      return res.status(400).json({ success: false, message: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" });

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email))
      return res.status(400).json({ success: false, message: "সঠিক ইমেইল ঠিকানা দিন।" });

    // ── Check duplicate email ──────────────────────────────────
    const { rows: existing } = await pool.query(
      "SELECT id FROM users WHERE email = $1", [email.toLowerCase().trim()]
    );
    if (existing.length)
      return res.status(409).json({ success: false, message: "এই ইমেইলে ইতিমধ্যে একটি অ্যাকাউন্ট আছে।" });

    // ── Hash password ──────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // ── Insert user ────────────────────────────────────────────
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [fullName.trim(), email.toLowerCase().trim(), passwordHash, phone?.trim() || null]
    );

    const user  = rows[0];
    const token = generateUserToken(user);

    console.log(`✅ নতুন রেজিস্ট্রেশন: ${user.email} (ID: ${user.id})`);

    res.status(201).json({
      success: true,
      message: "রেজিস্ট্রেশন সফল হয়েছে! স্বাগতম।",
      token,
      user:    toUserDTO(user),
    });
  } catch (err) {
    console.error("[User.register]", err.message);
    res.status(500).json({ success: false, message: "রেজিস্ট্রেশনে সমস্যা হয়েছে।" });
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/login
   Body: { email, password }
──────────────────────────────────────────────────────────────── */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: "ইমেইল ও পাসওয়ার্ড দিন।" });

    // ── Find user ──────────────────────────────────────────────
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND is_active = TRUE",
      [email.toLowerCase().trim()]
    );

    if (!rows.length)
      return res.status(401).json({ success: false, message: "ইমেইল বা পাসওয়ার্ড ভুল।" });

    const user = rows[0];

    // ── Verify password ────────────────────────────────────────
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch)
      return res.status(401).json({ success: false, message: "ইমেইল বা পাসওয়ার্ড ভুল।" });

    // ── Update last login ──────────────────────────────────────
    await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);

    const token = generateUserToken(user);
    console.log(`✅ লগইন: ${user.email}`);

    res.json({
      success: true,
      message: "লগইন সফল হয়েছে!",
      token,
      user:    toUserDTO(user),
    });
  } catch (err) {
    console.error("[User.login]", err.message);
    res.status(500).json({ success: false, message: "লগইনে সমস্যা হয়েছে।" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/auth/me  (protected)
──────────────────────────────────────────────────────────────── */
const getMe = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND is_active = TRUE", [req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "ব্যবহারকারী পাওয়া যায়নি।" });

    res.json({ success: true, user: toUserDTO(rows[0]) });
  } catch (err) {
    console.error("[User.getMe]", err.message);
    res.status(500).json({ success: false, message: "প্রোফাইল লোড করতে সমস্যা।" });
  }
};

/* ─────────────────────────────────────────────────────────────
   PUT /api/auth/profile  (protected)
   Body: { fullName, phone, address, district, thana }
──────────────────────────────────────────────────────────────── */
const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, address, district, thana } = req.body;

    const { rows } = await pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           phone     = COALESCE($2, phone),
           address   = COALESCE($3, address),
           district  = COALESCE($4, district),
           thana     = COALESCE($5, thana)
       WHERE id = $6 RETURNING *`,
      [
        fullName?.trim() || null,
        phone?.trim()    || null,
        address?.trim()  || null,
        district         || null,
        thana            || null,
        req.user.id,
      ]
    );

    if (!rows.length)
      return res.status(404).json({ success: false, message: "ব্যবহারকারী পাওয়া যায়নি।" });

    res.json({ success: true, message: "প্রোফাইল আপডেট হয়েছে।", user: toUserDTO(rows[0]) });
  } catch (err) {
    console.error("[User.updateProfile]", err.message);
    res.status(500).json({ success: false, message: "প্রোফাইল আপডেট করতে সমস্যা।" });
  }
};

/* ─────────────────────────────────────────────────────────────
   PUT /api/auth/change-password  (protected)
   Body: { currentPassword, newPassword }
──────────────────────────────────────────────────────────────── */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "বর্তমান ও নতুন পাসওয়ার্ড দিন।" });

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" });

    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: "ব্যবহারকারী পাওয়া যায়নি।" });

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match)
      return res.status(401).json({ success: false, message: "বর্তমান পাসওয়ার্ড ভুল।" });

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, req.user.id]);

    res.json({ success: true, message: "পাসওয়ার্ড পরিবর্তন হয়েছে।" });
  } catch (err) {
    console.error("[User.changePassword]", err.message);
    res.status(500).json({ success: false, message: "পাসওয়ার্ড পরিবর্তনে সমস্যা।" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/auth/orders  (protected) — user's own order history
──────────────────────────────────────────────────────────────── */
const getMyOrders = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, p.image AS product_image, p.unit AS product_unit
       FROM   orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE  o.user_id = $1
       ORDER  BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error("[User.getMyOrders]", err.message);
    res.status(500).json({ success: false, message: "অর্ডার লোড করতে সমস্যা।" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/admin/users  (admin only) — list all registered users
──────────────────────────────────────────────────────────────── */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset   = (pageNum - 1) * limitNum;

    const conditions = [];
    const params     = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`);
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    params.push(limitNum, offset);
    const sql = `
      SELECT id, full_name, email, phone, district, thana,
             is_active, is_verified, created_at, last_login_at,
             (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS order_count
      FROM   users
      ${where}
      ORDER  BY created_at DESC
      LIMIT  $${params.length - 1} OFFSET $${params.length}`;

    const countSql = `SELECT COUNT(*) FROM users ${where}`;

    const [data, count] = await Promise.all([
      pool.query(sql, params),
      pool.query(countSql, params.slice(0, params.length - 2)),
    ]);

    res.json({
      success:    true,
      total:      parseInt(count.rows[0].count, 10),
      page:       pageNum,
      limit:      limitNum,
      totalPages: Math.ceil(count.rows[0].count / limitNum),
      data:       data.rows.map(r => ({
        id:         r.id,
        fullName:   r.full_name,
        email:      r.email,
        phone:      r.phone,
        district:   r.district,
        thana:      r.thana,
        isActive:   r.is_active,
        isVerified: r.is_verified,
        orderCount: parseInt(r.order_count, 10),
        createdAt:  r.created_at,
        lastLogin:  r.last_login_at,
      })),
    });
  } catch (err) {
    console.error("[User.getAllUsers]", err.message);
    res.status(500).json({ success: false, message: "ব্যবহারকারীদের তালিকা লোড করতে সমস্যা।" });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword, getMyOrders, getAllUsers };

/**
 * src/routes/orderRoutes.js
 * ─────────────────────────────────────────────────────────────
 * Order routes — mix of public and admin-protected endpoints.
 *
 * Base path (mounted in server.js): /api
 * ─────────────────────────────────────────────────────────────
 */

"use strict";

const express         = require("express");
const router          = express.Router();
const orderCtrl       = require("../controllers/orderController");
const adminCtrl       = require("../controllers/adminController");
const productCtrl     = require("../controllers/productController");
const { requireAdmin, optionalUser } = require("../middleware/auth");

// ─────────────────────────────────────────────────────────────
// PUBLIC routes (no token required)
// ─────────────────────────────────────────────────────────────

// POST /api/orders — customer places an order (attach user if logged in)
router.post("/orders", optionalUser, orderCtrl.create);

// POST /api/contact — contact form (stub, extend as needed)
router.post("/contact", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "সমস্ত তথ্য পূরণ করুন।" });
  }
  // TODO: send email via nodemailer / SendGrid
  console.log("[Contact]", { name, email, message });
  res.json({ success: true, message: "আপনার বার্তা পাঠানো হয়েছে। ধন্যবাদ!" });
});

// ─────────────────────────────────────────────────────────────
// ADMIN AUTH routes (public — issues the JWT)
// ─────────────────────────────────────────────────────────────

// POST /api/admin/login
router.post("/admin/login", adminCtrl.login);

// ─────────────────────────────────────────────────────────────
// PROTECTED routes — all require a valid JWT Bearer token
// ─────────────────────────────────────────────────────────────

// GET  /api/admin/me — who am I?
router.get("/admin/me", requireAdmin, adminCtrl.getMe);

// GET  /api/admin/dashboard — summary stats
router.get("/admin/dashboard", requireAdmin, orderCtrl.getDashboard);

// GET  /api/admin/orders?status=pending&page=1&limit=20
router.get("/admin/orders", requireAdmin, orderCtrl.getAll);

// GET  /api/admin/orders/:id
router.get("/admin/orders/:id", requireAdmin, orderCtrl.getById);

// PATCH /api/admin/orders/:id/status  — update status or add note
router.patch("/admin/orders/:id/status", requireAdmin, orderCtrl.updateStatus);

// DELETE /api/admin/orders/:id — permanently delete an order
router.delete("/admin/orders/:id", requireAdmin, orderCtrl.remove);

// ─── Admin product management ─────────────────────────────────

// POST   /api/admin/products — create new product
router.post("/admin/products", requireAdmin, productCtrl.create);

// PUT    /api/admin/products/:id — update product
router.put("/admin/products/:id", requireAdmin, productCtrl.update);

// DELETE /api/admin/products/:id — soft-delete (marks out-of-stock)
router.delete("/admin/products/:id", requireAdmin, productCtrl.remove);

module.exports = router;

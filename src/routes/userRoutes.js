/**
 * src/routes/userRoutes.js
 * ─────────────────────────────────────────────────────────────
 * Customer authentication + profile routes.
 * Base path (mounted in server.js): /api
 * ─────────────────────────────────────────────────────────────
 */
"use strict";

const express    = require("express");
const router     = express.Router();
const userCtrl   = require("../controllers/userController");
const { requireUser, requireAdmin } = require("../middleware/auth");

// ── Public ────────────────────────────────────────────────────
router.post("/auth/register",        userCtrl.register);
router.post("/auth/login",           userCtrl.login);

// ── Protected (logged-in customer) ───────────────────────────
router.get ("/auth/me",              requireUser, userCtrl.getMe);
router.put ("/auth/profile",         requireUser, userCtrl.updateProfile);
router.put ("/auth/change-password", requireUser, userCtrl.changePassword);
router.get ("/auth/orders",          requireUser, userCtrl.getMyOrders);

// ── Admin — list all registered users ────────────────────────
router.get ("/admin/users",          requireAdmin, userCtrl.getAllUsers);

module.exports = router;

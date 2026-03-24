/**
 * src/routes/productRoutes.js
 * ─────────────────────────────────────────────────────────────
 * Public product routes — no authentication required.
 *
 * Base path (mounted in server.js): /api
 * ─────────────────────────────────────────────────────────────
 */

"use strict";

const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/productController");

// NOTE: /popular MUST be defined before /:id so Express does not
// interpret the string "popular" as a numeric ID.

// GET /api/products/popular
router.get("/products/popular", controller.getPopular);

// GET /api/products?category=তেল&inStock=true
router.get("/products", controller.getAll);

// GET /api/products/42
router.get("/products/:id", controller.getById);

module.exports = router;

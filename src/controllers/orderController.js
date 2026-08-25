/**
 * src/controllers/orderController.js
 * ─────────────────────────────────────────────────────────────
 * Business logic for the /api/orders and /api/admin/orders routes.
 * ─────────────────────────────────────────────────────────────
 */

"use strict";

const pool = require("../config/db");

// ── Helpers ───────────────────────────────────────────────────

/** Generates a human-readable order reference, e.g. "PB-1712345678901" */
const generateOrderRef = () => `PB-${Date.now()}`;

/** Maps a DB row to the API response shape */
const toOrderDTO = (row) => ({
  id:            row.id,
  orderRef:      row.order_ref,
  productId:     row.product_id,
  productName:   row.product_name,
  quantity:      row.quantity,
  unitPrice:     parseFloat(row.unit_price),
  totalPrice:    parseFloat(row.total_price),
  customerName:  row.customer_name,
  phone:         row.phone,
  address:       row.address,
  status:        row.status,
  adminNote:     row.admin_note,
  createdAt:     row.created_at,
  updatedAt:     row.updated_at,
});

// ─────────────────────────────────────────────────────────────
// POST /api/orders — place a single-product order (public)
// ─────────────────────────────────────────────────────────────
const create = async (req, res) => {
  const { productId, quantity, customerName, phone, address } = req.body;
    // Attach logged-in user if token was sent (optional)
    const userId = req.user?.id || null;

  // ── Validate input ───────────────────────────────────────────
  if (!productId || !quantity || !customerName || !phone || !address) {
    return res.status(400).json({
      success: false,
      message: "সমস্ত তথ্য পূরণ করুন।",
    });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 1) {
    return res.status(400).json({
      success: false,
      message: "পরিমাণ সঠিক নয়।",
    });
  }

  try {
    // ── 1. Look up the product to get name & price snapshot ───
    const { rows: productRows } = await pool.query(
      "SELECT id, name, price, in_stock FROM products WHERE id = $1",
      [parseInt(productId, 10)]
    );

    if (!productRows.length) {
      return res.status(404).json({ success: false, message: "পণ্য পাওয়া যায়নি।" });
    }

    const product = productRows[0];

    if (!product.in_stock) {
      return res.status(400).json({
        success: false,
        message: `"${product.name}" এখন স্টকে নেই।`,
      });
    }

    // ── 2. Insert the order row ─────────────────────────────────
    const orderRef = generateOrderRef();

    const { rows } = await pool.query(
      `INSERT INTO orders
         (order_ref, product_id, product_name, quantity, unit_price,
          customer_name, phone, address, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        orderRef,
        product.id,
        product.name,
        qty,
        parseFloat(product.price),
        customerName.trim(),
        phone.trim(),
        address.trim(),
        userId,
      ]
    );

    res.status(201).json({
      success: true,
      message: "অর্ডার সফলভাবে গ্রহণ করা হয়েছে।",
      data:    toOrderDTO(rows[0]),
    });
  } catch (err) {
    console.error("[Orders.create]", err.message);
    res.status(500).json({
      success: false,
      message: "অর্ডার সংরক্ষণ করতে সমস্যা হয়েছে।",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/orders — list all orders (admin only)
// Query params: ?status=pending  &phone=017…  &page=1  &limit=20
// ─────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { status, phone, orderRef, page = 1, limit = 20 } = req.query;

    const conditions = [];
    const params     = [];

    if (status) {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }
    if (phone) {
      params.push(`%${phone}%`);
      conditions.push(`o.phone ILIKE $${params.length}`);
    }
    if (orderRef) {
      params.push(`%${orderRef}%`);
      conditions.push(`o.order_ref ILIKE $${params.length}`);
    }

    const whereClause = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    // Pagination
    const pageNum  = Math.max(1, parseInt(page,  10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset   = (pageNum - 1) * limitNum;

    params.push(limitNum, offset);

    const sql = `
      SELECT   o.*,
               p.image   AS product_image,
               p.unit    AS product_unit
      FROM     orders    o
      LEFT JOIN products p ON p.id = o.product_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT  $${params.length - 1}
      OFFSET $${params.length}
    `;

    // Run the data query and a count query in parallel
    const countSql = `SELECT COUNT(*) FROM orders o ${whereClause}`;
    const [dataResult, countResult] = await Promise.all([
      pool.query(sql,      params),
      pool.query(countSql, params.slice(0, params.length - 2)), // exclude limit/offset
    ]);

    res.json({
      success:    true,
      total:      parseInt(countResult.rows[0].count, 10),
      page:       pageNum,
      limit:      limitNum,
      totalPages: Math.ceil(countResult.rows[0].count / limitNum),
      data:       dataResult.rows.map(toOrderDTO),
    });
  } catch (err) {
    console.error("[Orders.getAll]", err.message);
    res.status(500).json({
      success: false,
      message: "অর্ডারসমূহ লোড করতে সমস্যা হয়েছে।",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/orders/:id — single order detail (admin only)
// ─────────────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "অবৈধ অর্ডার আইডি।" });
    }

    const { rows } = await pool.query(
      `SELECT o.*, p.image AS product_image, p.unit AS product_unit
       FROM   orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE  o.id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "অর্ডার পাওয়া যায়নি।" });
    }

    res.json({ success: true, data: toOrderDTO(rows[0]) });
  } catch (err) {
    console.error("[Orders.getById]", err.message);
    res.status(500).json({
      success: false,
      message: "অর্ডার লোড করতে সমস্যা হয়েছে।",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/orders/:id/status — update order status (admin only)
// Body: { status: "confirmed" | "shipped" | "delivered" | "cancelled" }
//       { adminNote: "optional note" }
// ─────────────────────────────────────────────────────────────
const updateStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "অবৈধ অর্ডার আইডি।" });
    }

    const VALID_STATUSES = ["pending","confirmed","shipped","delivered","cancelled"];
    const { status, adminNote } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `অবৈধ স্ট্যাটাস। সঠিক মান: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const { rows } = await pool.query(
      `UPDATE orders
       SET  status     = COALESCE($1, status),
            admin_note = COALESCE($2, admin_note)
       WHERE id = $3
       RETURNING *`,
      [status || null, adminNote || null, id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "অর্ডার পাওয়া যায়নি।" });
    }

    res.json({
      success: true,
      message: "অর্ডার স্ট্যাটাস আপডেট হয়েছে।",
      data:    toOrderDTO(rows[0]),
    });
  } catch (err) {
    console.error("[Orders.updateStatus]", err.message);
    res.status(500).json({
      success: false,
      message: "অর্ডার আপডেট করতে সমস্যা হয়েছে।",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/dashboard — quick stats (admin only)
// ─────────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                          AS total_orders,
        COUNT(*) FILTER (WHERE status = 'pending')       AS pending,
        COUNT(*) FILTER (WHERE status = 'confirmed')     AS confirmed,
        COUNT(*) FILTER (WHERE status = 'shipped')       AS shipped,
        COUNT(*) FILTER (WHERE status = 'delivered')     AS delivered,
        COUNT(*) FILTER (WHERE status = 'cancelled')     AS cancelled,
        COALESCE(SUM(total_price)
          FILTER (WHERE status != 'cancelled'), 0)       AS total_revenue,
        COALESCE(SUM(total_price)
          FILTER (WHERE status = 'delivered'), 0)        AS delivered_revenue
      FROM orders
    `);

    const productCount = await pool.query(
      "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE in_stock) AS in_stock FROM products"
    );

    res.json({
      success: true,
      data: {
        orders:   rows[0],
        products: productCount.rows[0],
      },
    });
  } catch (err) {
    console.error("[Orders.getDashboard]", err.message);
    res.status(500).json({
      success: false,
      message: "ড্যাশবোর্ড ডেটা লোড করতে সমস্যা হয়েছে।",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/orders/:id — permanently delete an order (admin only)
// ─────────────────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "অবৈধ অর্ডার আইডি।" });
    }

    const { rows } = await pool.query(
      "DELETE FROM orders WHERE id = $1 RETURNING order_ref",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "অর্ডার পাওয়া যায়নি।" });
    }

    res.json({
      success: true,
      message: `অর্ডার "${rows[0].order_ref}" ডিলিট করা হয়েছে।`,
    });
  } catch (err) {
    console.error("[Orders.remove]", err.message);
    res.status(500).json({
      success: false,
      message: "অর্ডার ডিলিট করতে সমস্যা হয়েছে।",
    });
  }
};

module.exports = { create, getAll, getById, updateStatus, getDashboard, remove };

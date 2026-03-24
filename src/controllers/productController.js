/**
 * src/controllers/productController.js
 * ─────────────────────────────────────────────────────────────
 * All business logic for the /api/products routes.
 * Database queries use parameterised statements ($1, $2 …) to
 * prevent SQL injection.
 * ─────────────────────────────────────────────────────────────
 */

"use strict";

const pool = require("../config/db");

// ── Helpers ───────────────────────────────────────────────────

/**
 * Converts a snake_case DB row into the camelCase shape the
 * frontend already expects (backwards-compatible with the old
 * in-memory array format).
 */
const toProductDTO = (row) => ({
  id:       row.id,
  name:     row.name,
  nameEn:   row.name_en,
  price:    parseFloat(row.price),
  unit:     row.unit,
  image:    row.image,
  alt:      row.alt_text,
  category: row.category,
  badge:    row.badge,
  inStock:  row.in_stock,
});

// ─────────────────────────────────────────────────────────────
// GET /api/products
// Optional query params: ?category=তেল  &inStock=true
// ─────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { category, inStock } = req.query;

    // Build the WHERE clause dynamically
    const conditions = [];
    const params     = [];

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (inStock !== undefined) {
      params.push(inStock === "true");
      conditions.push(`in_stock = $${params.length}`);
    }

    const whereClause = conditions.length
      ? "WHERE " + conditions.join(" AND ")
      : "";

    const sql = `
      SELECT *
      FROM   products
      ${whereClause}
      ORDER  BY id ASC
    `;

    const { rows } = await pool.query(sql, params);

    res.json({
      success: true,
      count:   rows.length,
      data:    rows.map(toProductDTO),
    });
  } catch (err) {
    console.error("[Products.getAll]", err.message);
    res.status(500).json({
      success: false,
      message: "পণ্যসমূহ লোড করতে সমস্যা হয়েছে।",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/products/popular — first 4 in-stock products
// ─────────────────────────────────────────────────────────────
const getPopular = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM products WHERE in_stock = TRUE ORDER BY id ASC LIMIT 4`
    );

    res.json({
      success: true,
      count:   rows.length,
      data:    rows.map(toProductDTO),
    });
  } catch (err) {
    console.error("[Products.getPopular]", err.message);
    res.status(500).json({
      success: false,
      message: "জনপ্রিয় পণ্য লোড করতে সমস্যা হয়েছে।",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/products/:id — single product
// ─────────────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "অবৈধ পণ্য আইডি।" });
    }

    const { rows } = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "পণ্য পাওয়া যায়নি।" });
    }

    res.json({ success: true, data: toProductDTO(rows[0]) });
  } catch (err) {
    console.error("[Products.getById]", err.message);
    res.status(500).json({
      success: false,
      message: "পণ্য লোড করতে সমস্যা হয়েছে।",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/admin/products — create a new product (admin only)
// ─────────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { name, nameEn, price, unit, image, altText, category, badge, inStock } = req.body;

    if (!name || price === undefined || !unit) {
      return res.status(400).json({
        success: false,
        message: "name, price এবং unit আবশ্যক।",
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO products
         (name, name_en, price, unit, image, alt_text, category, badge, in_stock)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        name,
        nameEn   || null,
        parseFloat(price),
        unit,
        image    || "./assets/images/products/placeholder.jpg",
        altText  || name,
        category || null,
        badge    || null,
        inStock  !== undefined ? Boolean(inStock) : true,
      ]
    );

    res.status(201).json({
      success: true,
      message: "পণ্য সফলভাবে তৈরি হয়েছে।",
      data:    toProductDTO(rows[0]),
    });
  } catch (err) {
    console.error("[Products.create]", err.message);
    res.status(500).json({
      success: false,
      message: "পণ্য তৈরি করতে সমস্যা হয়েছে।",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/products/:id — update a product (admin only)
// ─────────────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "অবৈধ পণ্য আইডি।" });
    }

    const { name, nameEn, price, unit, image, altText, category, badge, inStock } = req.body;

    const { rows } = await pool.query(
      `UPDATE products
       SET  name      = COALESCE($1, name),
            name_en   = COALESCE($2, name_en),
            price     = COALESCE($3, price),
            unit      = COALESCE($4, unit),
            image     = COALESCE($5, image),
            alt_text  = COALESCE($6, alt_text),
            category  = COALESCE($7, category),
            badge     = COALESCE($8, badge),
            in_stock  = COALESCE($9, in_stock)
       WHERE id = $10
       RETURNING *`,
      [
        name    || null,
        nameEn  || null,
        price   !== undefined ? parseFloat(price) : null,
        unit    || null,
        image   || null,
        altText || null,
        category !== undefined ? category : null,
        badge    !== undefined ? badge    : null,
        inStock  !== undefined ? Boolean(inStock) : null,
        id,
      ]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "পণ্য পাওয়া যায়নি।" });
    }

    res.json({
      success: true,
      message: "পণ্য আপডেট হয়েছে।",
      data:    toProductDTO(rows[0]),
    });
  } catch (err) {
    console.error("[Products.update]", err.message);
    res.status(500).json({
      success: false,
      message: "পণ্য আপডেট করতে সমস্যা হয়েছে।",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/products/:id — soft-delete via in_stock flag
// ─────────────────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "অবৈধ পণ্য আইডি।" });
    }

    // Soft-delete: mark as out-of-stock rather than hard DELETE
    // so order history foreign keys remain intact.
    const { rows } = await pool.query(
      "UPDATE products SET in_stock = FALSE WHERE id = $1 RETURNING id, name",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "পণ্য পাওয়া যায়নি।" });
    }

    res.json({
      success: true,
      message: `"${rows[0].name}" স্টক থেকে সরিয়ে দেওয়া হয়েছে।`,
    });
  } catch (err) {
    console.error("[Products.remove]", err.message);
    res.status(500).json({
      success: false,
      message: "পণ্য মুছতে সমস্যা হয়েছে।",
    });
  }
};

module.exports = { getAll, getPopular, getById, create, update, remove };

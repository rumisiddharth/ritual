const express = require("express");
const { pool } = require("../db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// GET /habits
router.get("/", authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const result = await pool.query(
      `SELECT * FROM habits
       WHERE user_id = $1 AND archived_at IS NULL
       ORDER BY sort_order, id
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset],
    );
    res.json(result.rows);
  } catch (error) {
    req.log.error(error, "GET /habits failed");
    res.status(500).json({ error: "Failed to fetch habits" });
  }
});

// GET /habits/archived
// NOTE: must be defined BEFORE /:id routes or Express matches "archived" as an id
router.get("/archived", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM habits
       WHERE user_id = $1 AND archived_at IS NOT NULL
       ORDER BY archived_at DESC`,
      [req.user.id],
    );
    res.json(result.rows);
  } catch (error) {
    req.log.error(error, "GET /habits/archived failed");
    res.status(500).json({ error: "Failed to fetch archived habits" });
  }
});

// POST /habits
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, category = "general", color = "#888888" } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ error: "Name is required" });

    const result = await pool.query(
      `INSERT INTO habits (name, user_id, category, color)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim().slice(0, 120), req.user.id, category, color],
    );
    res.json(result.rows[0]);
  } catch (error) {
    req.log.error(error, "POST /habits failed");
    res.status(500).json({ error: "Failed to create habit" });
  }
});

// PUT /habits/:id
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, color } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ error: "Name is required" });

    const result = await pool.query(
      `UPDATE habits
       SET name = $1, category = $2, color = $3
       WHERE id = $4 AND user_id = $5 AND archived_at IS NULL
       RETURNING *`,
      [name.trim().slice(0, 120), category, color, id, req.user.id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Habit not found" });

    res.json(result.rows[0]);
  } catch (error) {
    req.log.error(error, "PUT /habits/:id failed");
    res.status(500).json({ error: "Failed to update habit" });
  }
});

// DELETE /habits/:id  (soft delete — archive)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE habits SET archived_at = now()
       WHERE id = $1 AND user_id = $2 AND archived_at IS NULL
       RETURNING id`,
      [id, req.user.id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Habit not found" });

    res.json({ message: `Habit ${id} archived` });
  } catch (error) {
    req.log.error(error, "DELETE /habits/:id failed");
    res.status(500).json({ error: "Failed to archive habit" });
  }
});

// DELETE /habits/:id/permanent
router.delete("/:id/permanent", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.user.id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Habit not found" });

    res.json({ message: `Habit ${id} permanently deleted` });
  } catch (error) {
    req.log.error(error, "DELETE /habits/:id/permanent failed");
    res.status(500).json({ error: "Failed to delete habit" });
  }
});

// PATCH /habits/:id/unarchive
router.patch("/:id/unarchive", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE habits SET archived_at = NULL
       WHERE id = $1 AND user_id = $2 AND archived_at IS NOT NULL
       RETURNING *`,
      [id, req.user.id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Archived habit not found" });

    res.json(result.rows[0]);
  } catch (error) {
    req.log.error(error, "PATCH /habits/:id/unarchive failed");
    res.status(500).json({ error: "Failed to unarchive habit" });
  }
});

module.exports = router;

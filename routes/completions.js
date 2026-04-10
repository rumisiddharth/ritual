const express = require("express");
const { pool } = require("../db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(str) {
  if (!DATE_REGEX.test(str)) return false;
  const d = new Date(str);
  return d instanceof Date && !isNaN(d);
}

// ── toYMD ──────────────────────────────────────────────────────────────────
// node-postgres can return DATE columns as either:
//   • a JS Date object parsed from "YYYY-MM-DD HH:MM:SS" (local time) — the
//     problematic case: IST midnight April 8 → UTC April 7 → wrong day
//   • an ISO string "2026-04-08T00:00:00.000Z"
// Both cases must produce "YYYY-MM-DD" using LOCAL date parts, never UTC.
function toYMD(d) {
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (typeof d === "string") return d.slice(0, 10);
  return String(d);
}

// POST /completions
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { habit_id, completed_date } = req.body;

    if (!completed_date || !isValidDate(completed_date))
      return res
        .status(400)
        .json({ error: "Invalid date format. Expected YYYY-MM-DD" });

    const habitCheck = await pool.query(
      "SELECT id FROM habits WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
      [habit_id, req.user.id],
    );
    if (habitCheck.rows.length === 0)
      return res.status(404).json({ error: "Habit not found" });

    const result = await pool.query(
      `INSERT INTO completions (habit_id, completed_date, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (habit_id, completed_date) DO NOTHING
       RETURNING *`,
      [habit_id, completed_date, req.user.id],
    );

    // ON CONFLICT DO NOTHING returns no rows — fetch the existing record
    if (result.rows.length === 0) {
      const existing = await pool.query(
        `SELECT * FROM completions WHERE habit_id = $1 AND completed_date = $2`,
        [habit_id, completed_date],
      );
      const row = existing.rows[0];
      // FIX: normalise before sending — Date object → local YYYY-MM-DD
      return res.json({ ...row, completed_date: toYMD(row.completed_date) });
    }

    const row = result.rows[0];
    // FIX: same normalisation for the fresh INSERT row
    res.json({ ...row, completed_date: toYMD(row.completed_date) });
  } catch (error) {
    req.log.error(error, "POST /completions failed");
    res.status(500).json({ error: "Failed to save completion" });
  }
});

// GET /completions/:year/:month
router.get("/:year/:month", authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);
    const offset = parseInt(req.query.offset) || 0;
    const start = `${year}-${month.padStart(2, "0")}-01`;

    // FIX: compute end with pure string arithmetic — no Date object, no UTC shift.
    // new Date(year, month, 1).toISOString() in IST gives April 30 instead of
    // May 1, which would silently drop the last day of the month from results.
    const paddedMonth = month.padStart(2, "0");
    const monthInt = parseInt(month, 10);
    let endYear = parseInt(year, 10);
    let endMonth = monthInt + 1;
    if (endMonth > 12) {
      endMonth = 1;
      endYear += 1;
    }
    const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const result = await pool.query(
      `SELECT c.*
       FROM completions c
       JOIN habits h ON h.id = c.habit_id
       WHERE h.user_id = $1
         AND h.archived_at IS NULL
         AND c.completed_date >= $2
         AND c.completed_date < $3
       ORDER BY c.completed_date
       LIMIT $4 OFFSET $5`,
      [req.user.id, start, end, limit, offset],
    );

    // FIX: toYMD handles both Date objects and strings, always using local
    // date parts so IST midnight never rolls back to the previous UTC day.
    const rows = result.rows.map((r) => ({
      ...r,
      completed_date: toYMD(r.completed_date),
    }));

    res.json(rows);
  } catch (error) {
    req.log.error(error, "GET /completions/:year/:month failed");
    res.status(500).json({ error: "Failed to fetch completions" });
  }
});

// DELETE /completions/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM completions
       USING habits
       WHERE completions.id = $1
         AND completions.habit_id = habits.id
         AND habits.user_id = $2
       RETURNING completions.id`,
      [id, req.user.id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Completion not found" });

    res.json({ message: `Completion ${id} deleted` });
  } catch (error) {
    req.log.error(error, "DELETE /completions/:id failed");
    res.status(500).json({ error: "Failed to delete completion" });
  }
});

// GET /streaks/all
router.get("/streaks/all", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT hs.habit_id, hs.current_streak, hs.longest_streak, hs.last_completed
       FROM habit_streaks hs
       JOIN habits h ON h.id = hs.habit_id
       WHERE h.user_id = $1 AND h.archived_at IS NULL`,
      [req.user.id],
    );
    const streaks = {};
    result.rows.forEach((row) => {
      streaks[row.habit_id] = row.current_streak;
    });
    res.json(streaks);
  } catch (error) {
    req.log.error(error, "GET /streaks failed");
    res.status(500).json({ error: "Failed to fetch streaks" });
  }
});

module.exports = router;

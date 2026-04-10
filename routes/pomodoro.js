// routes/pomodoro.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken: auth } = require("../middleware/auth");

function toYMD(date, tz = "UTC") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
}

// ─── POST /api/pomodoro/sessions ─────────────────────────────────────────────
router.post("/sessions", auth, async (req, res) => {
  const userId = req.user.id;
  const {
    habit_id = null,
    type = "focus",
    duration_mins,
    elapsed_mins,
    completed,
    started_at,
    distraction_count = 0, // ← NEW
  } = req.body;

  if (!["focus", "break"].includes(type)) {
    return res.status(400).json({ error: "type must be 'focus' or 'break'" });
  }
  if (
    typeof duration_mins !== "number" ||
    typeof elapsed_mins !== "number" ||
    typeof completed !== "boolean"
  ) {
    return res.status(400).json({
      error:
        "duration_mins, elapsed_mins (numbers) and completed (boolean) are required",
    });
  }

  // Validate habit ownership
  if (habit_id !== null) {
    const { rows } = await db.query(
      "SELECT id FROM habits WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
      [habit_id, userId],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "habit not found or archived" });
    }
  }

  const endedAt = new Date();
  const startedAt = started_at
    ? new Date(started_at)
    : new Date(endedAt.getTime() - elapsed_mins * 60_000);

  const { rows } = await db.query(
    `INSERT INTO pomodoro_sessions
       (user_id, habit_id, type, duration_mins, elapsed_mins, completed, started_at, ended_at, distraction_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      habit_id,
      type,
      duration_mins,
      elapsed_mins,
      completed,
      startedAt,
      endedAt,
      distraction_count,
    ],
  );

  const session = rows[0];

  let autoLogged = false;
  if (completed && type === "focus" && habit_id !== null) {
    try {
      const { rows: userRows } = await db.query(
        "SELECT timezone FROM users WHERE id = $1",
        [userId],
      );
      const tz = userRows[0]?.timezone || "UTC";
      const today = toYMD(endedAt, tz);

      const compResult = await db.query(
        `INSERT INTO completions (habit_id, completed_date, user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (habit_id, completed_date) DO NOTHING
         RETURNING id`,
        [habit_id, today, userId],
      );
      autoLogged = compResult.rows.length > 0;
    } catch (err) {
      console.error("pomodoro auto-log completion error:", err.message);
    }
  }

  res.status(201).json({ session, autoLogged });
});

// ─── GET /api/pomodoro/sessions ───────────────────────────────────────────────
router.get("/sessions", auth, async (req, res) => {
  const userId = req.user.id;

  const { rows: userRows } = await db.query(
    "SELECT timezone FROM users WHERE id = $1",
    [userId],
  );
  const tz = userRows[0]?.timezone || "UTC";

  const targetDate = req.query.date || toYMD(new Date(), tz);
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  const { rows } = await db.query(
    `SELECT
       ps.*,
       h.name  AS habit_name,
       h.color AS habit_color,
       h.category AS habit_category
     FROM pomodoro_sessions ps
     LEFT JOIN habits h ON h.id = ps.habit_id
     WHERE ps.user_id = $1
       AND (ps.started_at AT TIME ZONE $2)::date = $3::date
     ORDER BY ps.started_at DESC
     LIMIT $4`,
    [userId, tz, targetDate, limit],
  );

  const focusSessions = rows.filter((r) => r.type === "focus");
  const stats = {
    totalFocusMins: focusSessions.reduce(
      (acc, r) => acc + (r.elapsed_mins || 0),
      0,
    ),
    completedPomodoros: focusSessions.filter((r) => r.completed).length,
    abortedPomodoros: focusSessions.filter((r) => !r.completed).length,
    uniqueHabits: [
      ...new Set(focusSessions.map((r) => r.habit_id).filter(Boolean)),
    ].length,
  };

  res.json({ date: targetDate, sessions: rows, stats });
});

// ─── GET /api/pomodoro/sessions/history ──────────────────────────────────────
router.get("/sessions/history", auth, async (req, res) => {
  const userId = req.user.id;
  const days = Math.min(parseInt(req.query.days) || 7, 90);

  const { rows: userRows } = await db.query(
    "SELECT timezone FROM users WHERE id = $1",
    [userId],
  );
  const tz = userRows[0]?.timezone || "UTC";

  const { rows } = await db.query(
    `SELECT
       (started_at AT TIME ZONE $3)::date        AS day,
       COUNT(*) FILTER (WHERE type = 'focus' AND completed) AS completed_pomodoros,
       SUM(elapsed_mins) FILTER (WHERE type = 'focus')      AS focus_mins,
       COUNT(DISTINCT habit_id) FILTER (WHERE type='focus') AS habits_worked
     FROM pomodoro_sessions
     WHERE user_id = $1
       AND started_at >= NOW() - ($2 || ' days')::interval
     GROUP BY day
     ORDER BY day DESC`,
    [userId, days, tz],
  );

  res.json({ days, history: rows });
});

module.exports = router;

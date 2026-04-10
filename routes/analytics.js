const express = require("express");
const { pool } = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { recomputeCorrelationsForUser } = require("../lib/correlations");

const router = express.Router();

// In-memory cooldown map — replace with Redis for multi-instance deploys
const refreshCooldowns = new Map();

// GET /habit-dna
router.get("/habit-dna", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query("UPDATE users SET last_active_at = now() WHERE id = $1", [
      userId,
    ]);

    const habitsResult = await pool.query(
      `SELECT id, name, color, category FROM habits
       WHERE user_id = $1 AND archived_at IS NULL`,
      [userId],
    );
    const habits = habitsResult.rows;
    if (habits.length === 0) return res.json([]);

    const tzResult = await pool.query(
      "SELECT timezone FROM users WHERE id = $1",
      [userId],
    );
    const tz = tzResult.rows[0]?.timezone || "UTC";

    const completionsResult = await pool.query(
      `SELECT c.habit_id, c.completed_date
       FROM completions c
       JOIN habits h ON h.id = c.habit_id
       WHERE h.user_id = $1
         AND h.archived_at IS NULL
         AND c.completed_date >= (now() AT TIME ZONE $2)::date - INTERVAL '90 days'
       ORDER BY c.habit_id, c.completed_date`,
      [userId, tz],
    );

    const nowResult = await pool.query(
      "SELECT (now() AT TIME ZONE $1)::date AS local_today",
      [tz],
    );
    const localToday = new Date(nowResult.rows[0].local_today);
    const completions = completionsResult.rows;

    const dna = habits.map((habit) => {
      const habitCompletions = completions
        .filter((c) => c.habit_id === habit.id)
        .map((c) => new Date(c.completed_date));

      const totalDays = 90;
      const totalCompleted = habitCompletions.length;
      const consistency = Math.round((totalCompleted / totalDays) * 100);

      const weekendCount = habitCompletions.filter((d) => {
        const day = d.getDay();
        return day === 0 || day === 6;
      }).length;
      const weekendBias =
        totalCompleted === 0
          ? 50
          : Math.round((weekendCount / totalCompleted) * 100);

      const weekCounts = {};
      habitCompletions.forEach((d) => {
        const weekNum = Math.floor(
          (d - new Date(d.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000),
        );
        weekCounts[weekNum] = (weekCounts[weekNum] || 0) + 1;
      });
      const weeks = Object.values(weekCounts);
      const meanWeekly =
        weeks.length === 0
          ? 0
          : weeks.reduce((a, b) => a + b, 0) / weeks.length;
      const variance =
        weeks.length === 0
          ? 0
          : weeks.reduce((s, w) => s + Math.pow(w - meanWeekly, 2), 0) /
            weeks.length;
      const burstScore =
        meanWeekly === 0
          ? 0
          : Math.min(100, Math.round((Math.sqrt(variance) / meanWeekly) * 100));

      let recoveryScore = 50;
      if (habitCompletions.length >= 2) {
        const sorted = [...habitCompletions].sort((a, b) => a - b);
        const gaps = [];
        for (let i = 1; i < sorted.length; i++) {
          const gapDays = Math.round(
            (sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24),
          );
          if (gapDays > 1) gaps.push(gapDays - 1);
        }
        const avgGap =
          gaps.length === 0 ? 0 : gaps.reduce((a, b) => a + b, 0) / gaps.length;
        recoveryScore = Math.max(0, Math.round(100 - (avgGap - 1) * 15));
      }

      const ms30 = 30 * 24 * 60 * 60 * 1000;
      const ms60 = 60 * 24 * 60 * 60 * 1000;
      const last30 = habitCompletions.filter(
        (d) => localToday - d <= ms30,
      ).length;
      const prev30 = habitCompletions.filter((d) => {
        const diff = localToday - d;
        return diff > ms30 && diff <= ms60;
      }).length;
      const momentum =
        last30 + prev30 === 0
          ? 50
          : Math.round((last30 / (last30 + prev30)) * 100);

      return {
        id: habit.id,
        name: habit.name,
        color: habit.color,
        category: habit.category,
        totalCompleted,
        dna: { consistency, weekendBias, burstScore, recoveryScore, momentum },
      };
    });

    res.json(dna);
  } catch (error) {
    req.log.error(error, "GET /habit-dna failed");
    res.status(500).json({ error: "Failed to compute DNA" });
  }
});

// GET /correlations
router.get("/correlations", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query("UPDATE users SET last_active_at = now() WHERE id = $1", [
      userId,
    ]);

    const corrResult = await pool.query(
      `SELECT hc.* FROM habit_correlations hc
       WHERE hc.user_id = $1 ORDER BY ABS(hc.phi) DESC`,
      [userId],
    );

    if (corrResult.rows.length === 0) {
      await recomputeCorrelationsForUser(userId);
      const fresh = await pool.query(
        `SELECT * FROM habit_correlations WHERE user_id = $1 ORDER BY ABS(phi) DESC`,
        [userId],
      );
      if (fresh.rows.length === 0) return res.json([]);
      corrResult.rows.push(...fresh.rows);
    }

    const habitsResult = await pool.query(
      "SELECT id, name, color FROM habits WHERE user_id = $1",
      [userId],
    );
    const habitMap = {};
    habitsResult.rows.forEach((h) => {
      habitMap[h.id] = h;
    });

    const correlations = corrResult.rows.map((row) => ({
      habit_a: {
        id: row.habit_a_id,
        name: habitMap[row.habit_a_id]?.name ?? "Unknown",
        color: habitMap[row.habit_a_id]?.color ?? "#888",
      },
      habit_b: {
        id: row.habit_b_id,
        name: habitMap[row.habit_b_id]?.name ?? "Unknown",
        color: habitMap[row.habit_b_id]?.color ?? "#888",
      },
      co_occurrences: row.co_occurrences,
      days_a: row.days_a,
      days_b: row.days_b,
      phi: parseFloat(row.phi),
      overlap_pct: row.overlap_pct,
      computed_at: row.computed_at,
    }));

    res.json(correlations);
  } catch (error) {
    req.log.error(error, "GET /correlations failed");
    res.status(500).json({ error: "Failed to fetch correlations" });
  }
});

// POST /correlations/refresh
router.post("/correlations/refresh", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = Date.now();
    const last = refreshCooldowns.get(userId) || 0;
    const COOLDOWN_MS = 5 * 60 * 1000;

    if (now - last < COOLDOWN_MS) {
      const secondsLeft = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
      return res.status(429).json({
        error: `Please wait ${secondsLeft}s before refreshing again`,
      });
    }

    refreshCooldowns.set(userId, now);
    await recomputeCorrelationsForUser(userId);
    res.json({
      message: "Correlations refreshed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error(error, "POST /correlations/refresh failed");
    res.status(500).json({ error: "Refresh failed" });
  }
});

module.exports = router;

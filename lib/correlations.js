const { pool } = require("../db");

async function recomputeCorrelationsForUser(userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM habit_correlations WHERE user_id = $1", [
      userId,
    ]);
    await client.query(
      `
      WITH habit_dates AS (
        SELECT c.habit_id, c.completed_date
        FROM completions c
        JOIN habits h ON h.id = c.habit_id
        WHERE h.user_id = $1
          AND h.archived_at IS NULL
          AND c.completed_date >= CURRENT_DATE - INTERVAL '90 days'
      ),
      pairs AS (
        SELECT
          a.habit_id AS habit_a,
          b.habit_id AS habit_b,
          COUNT(*)   AS co_occurrences
        FROM habit_dates a
        JOIN habit_dates b
          ON a.completed_date = b.completed_date
         AND a.habit_id < b.habit_id
        GROUP BY a.habit_id, b.habit_id
      ),
      individual_counts AS (
        SELECT habit_id, COUNT(*) AS total_days
        FROM habit_dates
        GROUP BY habit_id
      ),
      total_const AS (SELECT 90 AS total_days)
      INSERT INTO habit_correlations
        (user_id, habit_a_id, habit_b_id, phi, co_occurrences,
         days_a, days_b, overlap_pct, computed_at)
      SELECT
        $1,
        p.habit_a,
        p.habit_b,
        CASE
          WHEN ia.total_days * ib.total_days *
               (t.total_days - ia.total_days) *
               (t.total_days - ib.total_days) = 0
          THEN 0
          ELSE ROUND(
            (p.co_occurrences * t.total_days - ia.total_days * ib.total_days)::numeric /
            SQRT(
              (ia.total_days * ib.total_days *
               (t.total_days - ia.total_days) *
               (t.total_days - ib.total_days))::numeric
            ), 3
          )
        END,
        p.co_occurrences,
        ia.total_days,
        ib.total_days,
        ROUND(
          (p.co_occurrences::numeric /
           NULLIF(LEAST(ia.total_days, ib.total_days), 0)) * 100
        ),
        now()
      FROM pairs p
      JOIN individual_counts ia ON ia.habit_id = p.habit_a
      JOIN individual_counts ib ON ib.habit_id = p.habit_b
      CROSS JOIN total_const t
      `,
      [userId],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(
      `Correlation recompute failed for user ${userId}:`,
      err.message,
    );
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { recomputeCorrelationsForUser };

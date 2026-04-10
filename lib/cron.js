const cron = require("node-cron");
const { pool } = require("../db");
const { recomputeCorrelationsForUser } = require("./correlations");

function startCronJobs() {
  // Nightly correlation recompute at 02:00 server time
  cron.schedule("0 2 * * *", async () => {
    console.info("[cron] Starting nightly correlation recompute...");
    try {
      const result = await pool.query(
        `SELECT id FROM users
         WHERE last_active_at >= now() - INTERVAL '25 hours'
            OR last_active_at IS NULL`,
      );
      console.info(`[cron] Recomputing for ${result.rows.length} active users`);
      for (const user of result.rows) {
        try {
          await recomputeCorrelationsForUser(user.id);
        } catch {
          // per-user failures logged inside recomputeCorrelationsForUser
        }
      }
      console.info("[cron] Correlation recompute complete.");
    } catch (err) {
      console.error("[cron] Batch query failed:", err.message);
    }
  });
}

module.exports = { startCronJobs };

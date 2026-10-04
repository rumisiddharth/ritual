require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pino = require("pino-http");
const rateLimit = require("express-rate-limit");

// ─── Startup env validation ───────────────────────────────────────────────────
const REQUIRED_ENV = ["JWT_SECRET", "CLIENT_ORIGIN", "DATABASE_URL"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(
    `FATAL: Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET must be at least 32 characters");
  process.exit(1);
}

const { pool } = require("./db");
const { startCronJobs } = require("./lib/cron");
const { authenticateToken } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const habitRoutes = require("./routes/habits");
const completionRoutes = require("./routes/completions");
const analyticsRoutes = require("./routes/analytics");
const pomodoroRoutes = require("./routes/pomodoro");

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(pino({ level: process.env.LOG_LEVEL || "info" }));
app.use(express.json({ limit: "100kb" }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));

// ─── Rate limiters ────────────────────────────────────────────────────────────
app.use(
  "/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts" },
  }),
);
app.use(
  "/habits",
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests" },
  }),
);
app.use(
  "/completions",
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests" },
  }),
);
app.use(
  "/api/pomodoro",
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests" },
  }),
);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", uptime: process.uptime(), db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

app.get("/", (_req, res) => res.send("Habit Tracker API is running"));

// ─── /streaks convenience alias (App.js calls GET /streaks) ──────────────────
app.get("/streaks", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT hs.habit_id, hs.current_streak
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

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/habits", habitRoutes);
app.use("/completions", completionRoutes);
app.use("/", analyticsRoutes); // /habit-dna, /correlations, /correlations/refresh
app.use("/api/pomodoro", pomodoroRoutes);

// ─── Fallbacks ────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  req.log.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.info(`Server running on port ${PORT}`);
  startCronJobs();
});

process.on("SIGTERM", async () => {
  console.info("SIGTERM received — shutting down gracefully");
  server.close(async () => {
    await pool.end();
    console.info("Pool closed. Exiting.");
    process.exit(0);
  });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

-- ============================================================
-- Streak Timezone Fix — migration_streak_tz_fix.sql
-- Run after the original migration.sql
-- Fixes: compute_streak used CURRENT_DATE (UTC), breaking streaks
-- for users in UTC+ timezones who complete habits in the evening.
-- ============================================================

-- ─── Updated streak function ──────────────────────────────────
-- Accepts an optional p_local_date parameter so the trigger can
-- pass the habit owner's resolved local date.
-- Falls back to CURRENT_DATE when called without it (backfill, etc.)
CREATE OR REPLACE FUNCTION compute_streak(
  p_habit_id   INTEGER,
  p_local_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_current INT  := 0;
  v_longest INT  := 0;
  v_run     INT  := 0;
  v_last    DATE;
  v_prev    DATE;
  rec       RECORD;
BEGIN
  -- ── Current streak (descending, must touch local today or yesterday) ──
  v_last := NULL;
  FOR rec IN (
    SELECT completed_date::DATE AS d
    FROM   completions
    WHERE  habit_id = p_habit_id
    ORDER  BY completed_date DESC
  ) LOOP
    IF v_last IS NULL THEN
      -- FIX: compare against p_local_date instead of CURRENT_DATE
      IF rec.d >= p_local_date - 1 THEN
        v_current := 1;
        v_last    := rec.d;
      ELSE
        EXIT;
      END IF;
    ELSIF rec.d = v_last - 1 THEN
      v_current := v_current + 1;
      v_last    := rec.d;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  -- ── Longest streak (ascending pass) ──────────────────────────
  v_run  := 0;
  v_prev := NULL;
  FOR rec IN (
    SELECT completed_date::DATE AS d
    FROM   completions
    WHERE  habit_id = p_habit_id
    ORDER  BY completed_date ASC
  ) LOOP
    IF v_prev IS NULL OR rec.d = v_prev + 1 THEN
      v_run := v_run + 1;
    ELSE
      v_run := 1;
    END IF;
    IF v_run > v_longest THEN v_longest := v_run; END IF;
    v_prev := rec.d;
  END LOOP;

  -- ── Last completion date ──────────────────────────────────────
  SELECT MAX(completed_date)::DATE
  INTO   v_last
  FROM   completions
  WHERE  habit_id = p_habit_id;

  INSERT INTO habit_streaks
    (habit_id, current_streak, longest_streak, last_completed, updated_at)
  VALUES
    (p_habit_id, v_current, v_longest, v_last, now())
  ON CONFLICT (habit_id) DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    last_completed = EXCLUDED.last_completed,
    updated_at     = now();
END;
$$;

-- ─── Updated trigger function ─────────────────────────────────
-- Resolves the habit owner's timezone and passes local date
-- to compute_streak so streak boundaries are correct globally.
CREATE OR REPLACE FUNCTION trg_update_streak()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_habit_id  INTEGER;
  v_user_tz   TEXT;
  v_local_date DATE;
BEGIN
  v_habit_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.habit_id ELSE NEW.habit_id END;

  -- Resolve the habit owner's timezone
  SELECT COALESCE(u.timezone, 'UTC')
  INTO   v_user_tz
  FROM   habits h
  JOIN   users  u ON u.id = h.user_id
  WHERE  h.id = v_habit_id;

  -- Compute the owner's current local date
  SELECT (now() AT TIME ZONE COALESCE(v_user_tz, 'UTC'))::date
  INTO   v_local_date;

  PERFORM compute_streak(v_habit_id, v_local_date);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Recreate the trigger (function signature changed so DROP + CREATE is safe)
DROP TRIGGER IF EXISTS trg_completion_streak ON completions;
CREATE TRIGGER trg_completion_streak
  AFTER INSERT OR DELETE ON completions
  FOR EACH ROW EXECUTE FUNCTION trg_update_streak();

-- ─── Backfill streaks with correct local dates ────────────────
-- This re-runs compute_streak for every habit using UTC as a
-- safe default. Users in UTC+ may see their current streak
-- corrected by +1 on their next toggle — that's expected.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM habits LOOP
    PERFORM compute_streak(r.id);
  END LOOP;
END $$;

-- ─── Done ─────────────────────────────────────────────────────
-- Verify with:
--   SELECT h.name, hs.current_streak, hs.last_completed
--   FROM habit_streaks hs JOIN habits h ON h.id = hs.habit_id
--   ORDER BY hs.current_streak DESC LIMIT 10;


-- migrations/add_user_profile_fields.sql
-- Run once to add the new columns for the updated signup flow.
-- Safe to run on existing DBs (uses IF NOT EXISTS / default NULL).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name  TEXT,
  ADD COLUMN IF NOT EXISTS username   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS phone      TEXT;

-- Backfill username from email prefix for existing rows (optional)
UPDATE users
SET username = split_part(email, '@', 1)
WHERE username IS NULL;


-- ============================================================
-- Pomodoro Sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id      INTEGER REFERENCES habits(id) ON DELETE SET NULL,
  type          VARCHAR(10) NOT NULL DEFAULT 'focus' CHECK (type IN ('focus', 'break')),
  duration_mins INTEGER NOT NULL,
  elapsed_mins  INTEGER NOT NULL,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pomodoro_user_started
  ON pomodoro_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_pomodoro_habit
  ON pomodoro_sessions (habit_id, started_at DESC);

  -- ============================================================
-- Add distraction_count to pomodoro_sessions
-- ============================================================
ALTER TABLE pomodoro_sessions ADD COLUMN IF NOT EXISTS distraction_count INT DEFAULT 0;
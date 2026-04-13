CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  first_name TEXT,
  last_name TEXT,
  username TEXT UNIQUE,
  phone TEXT,
  last_active_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  color TEXT DEFAULT '#888',
  sort_order INTEGER DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS completions (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, completed_date)
);

CREATE TABLE IF NOT EXISTS habit_streaks (
  habit_id INTEGER PRIMARY KEY REFERENCES habits(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_correlations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  habit_id_a INTEGER REFERENCES habits(id) ON DELETE CASCADE,
  habit_id_b INTEGER REFERENCES habits(id) ON DELETE CASCADE,
  phi_coefficient NUMERIC(5,4),
  sample_size INTEGER,
  computed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  habit_id INTEGER REFERENCES habits(id) ON DELETE SET NULL,
  duration_minutes INTEGER DEFAULT 25,
  completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION compute_streak(
  p_habit_id   INTEGER,
  p_local_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_current INT := 0;
  v_longest INT := 0;
  v_run     INT := 0;
  v_last    DATE;
  v_prev    DATE;
  rec       RECORD;
BEGIN
  v_last := NULL;
  FOR rec IN (
    SELECT completed_date::DATE AS d
    FROM completions WHERE habit_id = p_habit_id
    ORDER BY completed_date DESC
  ) LOOP
    IF v_last IS NULL THEN
      IF rec.d >= p_local_date - 1 THEN
        v_current := 1; v_last := rec.d;
      ELSE EXIT;
      END IF;
    ELSIF rec.d = v_last - 1 THEN
      v_current := v_current + 1; v_last := rec.d;
    ELSE EXIT;
    END IF;
  END LOOP;

  v_run := 0; v_prev := NULL;
  FOR rec IN (
    SELECT completed_date::DATE AS d
    FROM completions WHERE habit_id = p_habit_id
    ORDER BY completed_date ASC
  ) LOOP
    IF v_prev IS NULL OR rec.d = v_prev + 1 THEN v_run := v_run + 1;
    ELSE v_run := 1;
    END IF;
    IF v_run > v_longest THEN v_longest := v_run; END IF;
    v_prev := rec.d;
  END LOOP;

  SELECT MAX(completed_date)::DATE INTO v_last
  FROM completions WHERE habit_id = p_habit_id;

  INSERT INTO habit_streaks (habit_id, current_streak, longest_streak, last_completed, updated_at)
  VALUES (p_habit_id, v_current, v_longest, v_last, now())
  ON CONFLICT (habit_id) DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    last_completed = EXCLUDED.last_completed,
    updated_at     = now();
END;
$$;

CREATE OR REPLACE FUNCTION trg_update_streak()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_habit_id   INTEGER;
  v_user_tz    TEXT;
  v_local_date DATE;
BEGIN
  v_habit_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.habit_id ELSE NEW.habit_id END;
  SELECT COALESCE(u.timezone, 'UTC') INTO v_user_tz
  FROM habits h JOIN users u ON u.id = h.user_id WHERE h.id = v_habit_id;
  SELECT (now() AT TIME ZONE COALESCE(v_user_tz, 'UTC'))::date INTO v_local_date;
  PERFORM compute_streak(v_habit_id, v_local_date);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_completion_streak ON completions;
CREATE TRIGGER trg_completion_streak
  AFTER INSERT OR DELETE ON completions
  FOR EACH ROW EXECUTE FUNCTION trg_update_streak();

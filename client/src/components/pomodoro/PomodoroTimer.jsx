// client/src/components/pomodoro/PomodoroTimer.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import "./PomodoroTimer.css";

const API = "";

// ─── constants ───────────────────────────────────────────────────────────────
const MODES = {
  focus25: { label: "25 / 5", focus: 25, breakDur: 5, tag: "classic" },
  focus50: { label: "50 / 10", focus: 50, breakDur: 10, tag: "deep work" },
  focus90: { label: "90 / 20", focus: 90, breakDur: 20, tag: "flow" },
};

const PHASE = { IDLE: "idle", FOCUS: "focus", BREAK: "break" };

const AMBIENT = [
  { id: "none", label: "none", src: null },
  {
    id: "rain",
    label: "rain",
    src: "https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3",
  },
  {
    id: "white",
    label: "white noise",
    src: "https://assets.mixkit.co/active_storage/sfx/2530/2530-preview.mp3",
  },
  {
    id: "lofi",
    label: "lo-fi",
    src: "https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3",
  },
];

const COMPLETE_SFX =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const RADIUS = 88;
const CIRC = 2 * Math.PI * RADIUS;

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmt(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function hexToRgb(hex = "#6c63ff") {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// ─── component ───────────────────────────────────────────────────────────────
export default function PomodoroTimer({ habits = [], token, onCompletion }) {
  // ── mode ───────────────────────────────────────────────────────────────────
  const [modeKey, setModeKey] = useState("focus25");
  const [habitId, setHabitId] = useState(null);

  // ── timer ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [remaining, setRemaining] = useState(MODES.focus25.focus * 60);
  const [running, setRunning] = useState(false);

  // ── distraction ────────────────────────────────────────────────────────────
  const [distractionCount, setDistractionCount] = useState(0);

  // ── sessions ───────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState([]);
  const [loadingSess, setLoadingSess] = useState(false);

  // ── notification ───────────────────────────────────────────────────────────
  const [notifPerm, setNotifPerm] = useState(
    Notification?.permission ?? "default",
  );

  // ── right panel collapsibles ───────────────────────────────────────────────
  const [habitOpen, setHabitOpen] = useState(true);
  const [goalOpen, setGoalOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── mobile drawer ──────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── custom durations ───────────────────────────────────────────────────────
  const [customDurations, setCustomDurations] = useState(() =>
    lsGet("ritual_pomo_durations", {}),
  );

  const effectiveDur = useMemo(
    () => ({
      focus25: {
        focus: customDurations.focus25 ?? MODES.focus25.focus,
        breakDur: customDurations.focus25_break ?? MODES.focus25.breakDur,
      },
      focus50: {
        focus: customDurations.focus50 ?? MODES.focus50.focus,
        breakDur: customDurations.focus50_break ?? MODES.focus50.breakDur,
      },
      focus90: {
        focus: customDurations.focus90 ?? MODES.focus90.focus,
        breakDur: customDurations.focus90_break ?? MODES.focus90.breakDur,
      },
    }),
    [customDurations],
  );

  // ── auto-advance ───────────────────────────────────────────────────────────
  const [autoAdvance, setAutoAdvance] = useState(() =>
    lsGet("ritual_pomo_autoadvance", false),
  );

  // ── ambient ────────────────────────────────────────────────────────────────
  const [ambientId, setAmbientId] = useState("none");
  const [completeSnd, setCompleteSnd] = useState(true);
  const ambientAudioRef = useRef(null);
  const completeSndRef = useRef(null);

  // ── session goal ───────────────────────────────────────────────────────────
  const [sessionGoal, setSessionGoal] = useState(() =>
    lsGet("ritual_pomo_goal", 4),
  );
  const [dailyCount, setDailyCount] = useState(() => {
    const today = new Date().toDateString();
    const saved = lsGet("ritual_pomo_daily", { date: "", count: 0 });
    return saved.date === today ? saved.count : 0;
  });

  // ── refs ───────────────────────────────────────────────────────────────────
  const intervalRef = useRef(null);
  const startedAtRef = useRef(null);
  const elapsedRef = useRef(0);
  const phaseRef = useRef(phase);
  const modeKeyRef = useRef(modeKey);
  const autoAdvanceRef = useRef(autoAdvance);
  const completeSndRef2 = useRef(completeSnd);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    modeKeyRef.current = modeKey;
  }, [modeKey]);
  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);
  useEffect(() => {
    completeSndRef2.current = completeSnd;
  }, [completeSnd]);

  const mode = MODES[modeKey];
  const eff = effectiveDur[modeKey];

  const selectedHabit = useMemo(
    () => habits.find((h) => h.id === habitId) ?? null,
    [habits, habitId],
  );
  const ringColor = selectedHabit?.color || "var(--accent)";

  // ── persist ────────────────────────────────────────────────────────────────
  useEffect(() => {
    lsSet("ritual_pomo_durations", customDurations);
  }, [customDurations]);
  useEffect(() => {
    lsSet("ritual_pomo_autoadvance", autoAdvance);
  }, [autoAdvance]);
  useEffect(() => {
    lsSet("ritual_pomo_goal", sessionGoal);
  }, [sessionGoal]);
  useEffect(() => {
    lsSet("ritual_pomo_daily", {
      date: new Date().toDateString(),
      count: dailyCount,
    });
  }, [dailyCount]);

  // ── document title ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (running && phase !== PHASE.IDLE) {
      document.title = `${fmt(remaining)} · ${phase === PHASE.FOCUS ? "focus" : "break"} · ritual.`;
    } else {
      document.title = "ritual.";
    }
    return () => {
      document.title = "ritual.";
    };
  }, [remaining, running, phase]);

  // ── completion sound init ──────────────────────────────────────────────────
  useEffect(() => {
    completeSndRef.current = new Audio(COMPLETE_SFX);
    completeSndRef.current.volume = 0.55;
  }, []);

  // ── ambient swap ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.pause();
      ambientAudioRef.current = null;
    }
    const track = AMBIENT.find((t) => t.id === ambientId);
    if (track?.src) {
      const audio = new Audio(track.src);
      audio.loop = true;
      audio.volume = 0.3;
      ambientAudioRef.current = audio;
      if (running) audio.play().catch(() => {});
    }
  }, [ambientId]); // eslint-disable-line

  useEffect(() => {
    const a = ambientAudioRef.current;
    if (!a) return;
    if (running) a.play().catch(() => {});
    else a.pause();
  }, [running]);

  // ── fetch sessions ─────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    if (!token) return;
    setLoadingSess(true);
    try {
      const res = await fetch(`${API}/api/pomodoro/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (_) {
    } finally {
      setLoadingSess(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ── tick ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          elapsedRef.current += 1;
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]); // eslint-disable-line

  // ── phase complete ─────────────────────────────────────────────────────────
  const handlePhaseComplete = useCallback(() => {
    setRunning(false);
    clearInterval(intervalRef.current);

    const curPhase = phaseRef.current;
    const curModeKey = modeKeyRef.current;
    const curEff = effectiveDur[curModeKey];
    const isBreak = curPhase === PHASE.BREAK;

    if (completeSndRef2.current) completeSndRef.current?.play().catch(() => {});

    saveSession({
      type: isBreak ? "break" : "focus",
      duration_mins: isBreak ? curEff.breakDur : curEff.focus,
      elapsed_mins: Math.round(elapsedRef.current / 60),
      completed: true,
    });

    notify(isBreak ? "Break over — back to it." : "Focus session complete! 🎯");

    if (isBreak) {
      resetToFocus();
    } else {
      setDailyCount((c) => c + 1);
      setDistractionCount(0);
      setPhase(PHASE.BREAK);
      setRemaining(curEff.breakDur * 60);
      elapsedRef.current = 0;
      startedAtRef.current = new Date();
      if (autoAdvanceRef.current) setTimeout(() => setRunning(true), 50);
    }
  }, [effectiveDur]); // eslint-disable-line

  // ─── controls ─────────────────────────────────────────────────────────────
  function startFocus() {
    elapsedRef.current = 0;
    startedAtRef.current = new Date();
    setDistractionCount(0);
    setPhase(PHASE.FOCUS);
    setRemaining(eff.focus * 60);
    setRunning(true);
  }

  function pauseResume() {
    setRunning((r) => !r);
  }

  function stop() {
    if (phase === PHASE.IDLE) return;
    setRunning(false);
    const isBreak = phase === PHASE.BREAK;
    saveSession({
      type: isBreak ? "break" : "focus",
      duration_mins: isBreak ? eff.breakDur : eff.focus,
      elapsed_mins: Math.round(elapsedRef.current / 60),
      completed: false,
    });
    resetToFocus();
  }

  function reset() {
    setRunning(false);
    clearInterval(intervalRef.current);
    setPhase(PHASE.IDLE);
    setRemaining(eff.focus * 60);
    elapsedRef.current = 0;
    startedAtRef.current = null;
    setDistractionCount(0);
  }

  function resetToFocus() {
    setPhase(PHASE.IDLE);
    setRemaining(eff.focus * 60);
    elapsedRef.current = 0;
    startedAtRef.current = null;
    setRunning(false);
    setDistractionCount(0);
  }

  function handleModeChange(key) {
    if (phase !== PHASE.IDLE) return;
    setModeKey(key);
    setRemaining(effectiveDur[key].focus * 60);
  }

  function setDur(modeK, field, val) {
    const num = Number(val);
    setCustomDurations((prev) => ({ ...prev, [`${modeK}${field}`]: num }));
    if (modeK === modeKey && phase === PHASE.IDLE && field === "")
      setRemaining(num * 60);
  }

  // ── save session ───────────────────────────────────────────────────────────
  async function saveSession(payload) {
    if (!token) return;
    try {
      const body = {
        ...payload,
        habit_id: habitId,
        started_at: startedAtRef.current?.toISOString(),
        distraction_count: distractionCount,
      };
      const res = await fetch(`${API}/api/pomodoro/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchSessions();
        if (data.autoLogged && onCompletion) onCompletion(habitId);
      }
    } catch (err) {
      console.error("Failed to save pomodoro session:", err);
    }
  }

  // ── notification ───────────────────────────────────────────────────────────
  async function notify(msg) {
    if (notifPerm === "default") {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
      if (perm !== "granted") return;
    }
    if (notifPerm === "granted" || Notification?.permission === "granted") {
      new Notification("ritual.", { body: msg, icon: "/favicon.ico" });
    }
  }

  // ── ring math ──────────────────────────────────────────────────────────────
  const totalSecs = phase === PHASE.BREAK ? eff.breakDur * 60 : eff.focus * 60;
  const progress = phase === PHASE.IDLE ? 1 : remaining / totalSecs;
  const dashOffset = CIRC * (1 - progress);

  const [r, g, b] = hexToRgb(selectedHabit?.color || "#a0957c");
  const glowColor = `rgba(${r},${g},${b},0.45)`;

  // ── today stats ────────────────────────────────────────────────────────────
  const focusDone = sessions.filter(
    (s) => s.type === "focus" && s.completed,
  ).length;
  const totalFocusM = sessions
    .filter((s) => s.type === "focus")
    .reduce((a, s) => a + (s.elapsed_mins || 0), 0);
  const uniqueHabits = [
    ...new Set(sessions.filter((s) => s.habit_id).map((s) => s.habit_id)),
  ].length;

  // ── goal ───────────────────────────────────────────────────────────────────
  const goalPercent =
    sessionGoal > 0
      ? Math.min(100, Math.round((dailyCount / sessionGoal) * 100))
      : 0;

  const isActive = phase !== PHASE.IDLE;
  const isBreak = phase === PHASE.BREAK;

  // ── left column ────────────────────────────────────────────────────────────
  const leftCol = (
    <div className="pomo-left">
      {/* header */}
      <div className="pomo-header">
        <span className="pomo-title">focus</span>
        <span className="pomo-subtitle">
          {isActive
            ? isBreak
              ? "breathe."
              : "deep work."
            : "select a habit, start the timer."}
        </span>
      </div>

      {/* mode chips */}
      <div className="pomo-modes">
        {Object.entries(MODES).map(([key, m]) => {
          const e = effectiveDur[key];
          const customised = e.focus !== m.focus || e.breakDur !== m.breakDur;
          return (
            <button
              key={key}
              className={`pomo-mode-chip ${modeKey === key ? "active" : ""} ${isActive ? "locked" : ""}`}
              onClick={() => handleModeChange(key)}
              title={isActive ? "Stop current session to change mode" : ""}
            >
              <span className="pomo-mode-label">
                {customised ? `${e.focus} / ${e.breakDur}` : m.label}
              </span>
              <span className="pomo-mode-tag">
                {m.tag}
                {customised ? " ✎" : ""}
              </span>
            </button>
          );
        })}
      </div>

      {/* ring */}
      <div
        className={`pomo-ring-wrap ${isActive ? "active" : ""} ${isBreak ? "is-break" : ""}`}
        style={{ "--glow": glowColor, "--ring-color": ringColor }}
      >
        <svg
          className="pomo-ring-svg"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle className="pomo-ring-track" cx="100" cy="100" r={RADIUS} />
          <circle
            className="pomo-ring-progress"
            cx="100"
            cy="100"
            r={RADIUS}
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            stroke={ringColor}
            style={{
              filter: isActive ? `drop-shadow(0 0 8px ${glowColor})` : "none",
            }}
          />
          {Array.from({ length: 60 }, (_, i) => {
            const angle = (i / 60) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const isMaj = i % 5 === 0;
            const inner = RADIUS + (isMaj ? 6 : 3);
            const outer = RADIUS + 14;
            return (
              <line
                key={i}
                className={`pomo-tick ${isMaj ? "major" : ""}`}
                x1={100 + inner * Math.cos(rad)}
                y1={100 + inner * Math.sin(rad)}
                x2={100 + outer * Math.cos(rad)}
                y2={100 + outer * Math.sin(rad)}
              />
            );
          })}
        </svg>
        <div className="pomo-time-display">
          <span className="pomo-time">{fmt(remaining)}</span>
          <span className="pomo-phase-tag">
            {phase === PHASE.IDLE && mode.tag}
            {phase === PHASE.FOCUS && "focusing"}
            {phase === PHASE.BREAK && "break"}
          </span>
          {selectedHabit && (
            <span className="pomo-linked-habit" style={{ color: ringColor }}>
              ↳ {selectedHabit.name}
            </span>
          )}
        </div>
      </div>

      {/* distraction log — only during focus */}
      {phase === PHASE.FOCUS && (
        <div className="pomo-distraction-row">
          <button
            className="pomo-distraction-btn"
            onClick={() => setDistractionCount((c) => c + 1)}
          >
            + distraction
          </button>
          {distractionCount > 0 && (
            <span className="pomo-distraction-count">
              {distractionCount} logged
            </span>
          )}
        </div>
      )}

      {/* controls */}
      <div className="pomo-controls">
        {!isActive ? (
          <button className="pomo-btn pomo-btn--start" onClick={startFocus}>
            start
          </button>
        ) : (
          <>
            <button
              className={`pomo-btn pomo-btn--pause ${!running ? "paused" : ""}`}
              onClick={pauseResume}
            >
              {running ? "pause" : "resume"}
            </button>
            <button className="pomo-btn pomo-btn--stop" onClick={stop}>
              stop
            </button>
            <button className="pomo-btn pomo-btn--reset" onClick={reset}>
              reset
            </button>
          </>
        )}
      </div>

      {/* stats */}
      <div className="pomo-today-stats">
        <div className="pomo-stat">
          <span className="pomo-stat-val">{focusDone}</span>
          <span className="pomo-stat-key">pomodoros</span>
        </div>
        <div className="pomo-stat-divider" />
        <div className="pomo-stat">
          <span className="pomo-stat-val">{totalFocusM}</span>
          <span className="pomo-stat-key">focus mins</span>
        </div>
        <div className="pomo-stat-divider" />
        <div className="pomo-stat">
          <span className="pomo-stat-val">{uniqueHabits}</span>
          <span className="pomo-stat-key">habits</span>
        </div>
      </div>

      {/* session strip */}
      {sessions.length > 0 && (
        <div className="pomo-session-strip">
          {[...sessions].reverse().map((s) => (
            <div
              key={s.id}
              className={`pomo-session-block ${s.type} ${s.completed ? "done" : "aborted"}`}
              style={{
                "--block-color":
                  s.habit_color ||
                  (s.type === "break" ? "var(--fg-subtle)" : "var(--accent)"),
                width: `${Math.max(
                  8,
                  Math.round(
                    (s.elapsed_mins /
                      Math.max(
                        totalFocusM +
                          sessions
                            .filter((x) => x.type === "break")
                            .reduce((a, x) => a + (x.elapsed_mins || 0), 0),
                        1,
                      )) *
                      100,
                  ),
                )}%`,
              }}
              title={`${s.type === "break" ? "Break" : s.habit_name || "Focus"} · ${s.elapsed_mins} min${s.completed ? "" : " (stopped)"}`}
            />
          ))}
        </div>
      )}

      {loadingSess && <p className="pomo-loading">loading sessions…</p>}
    </div>
  );

  // ── right column ───────────────────────────────────────────────────────────
  const rightCol = (
    <div className="pomo-right">
      {/* ── linked habit ── */}
      <div className="pomo-panel">
        <button
          className="pomo-panel-header"
          onClick={() => setHabitOpen((o) => !o)}
        >
          <span className="pomo-panel-label">linked habit</span>
          <span className={`pomo-panel-arrow ${habitOpen ? "open" : ""}`}>
            ▾
          </span>
        </button>
        {habitOpen && (
          <div className="pomo-panel-body">
            <button
              className={`pomo-habit-chip ${habitId === null ? "active" : ""}`}
              style={
                habitId === null ? { "--chip-color": "var(--fg-muted)" } : {}
              }
              onClick={() => setHabitId(null)}
              disabled={isActive}
            >
              <span
                className="pomo-habit-dot"
                style={{ background: "var(--fg-subtle)" }}
              />
              none
            </button>
            {habits.map((h) => (
              <button
                key={h.id}
                className={`pomo-habit-chip ${habitId === h.id ? "active" : ""}`}
                style={{ "--chip-color": h.color || "var(--accent)" }}
                onClick={() => setHabitId(h.id)}
                disabled={isActive}
                title={h.name}
              >
                <span
                  className="pomo-habit-dot"
                  style={{ background: h.color || "var(--accent)" }}
                />
                {h.name.length > 18 ? h.name.slice(0, 17) + "…" : h.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── today's goal ── */}
      <div className="pomo-panel">
        <button
          className="pomo-panel-header"
          onClick={() => setGoalOpen((o) => !o)}
        >
          <span className="pomo-panel-label">today's goal</span>
          <span className={`pomo-panel-arrow ${goalOpen ? "open" : ""}`}>
            ▾
          </span>
        </button>
        {goalOpen && (
          <div className="pomo-panel-body">
            <div className="pomo-goal-header">
              <span className="pomo-goal-label">progress</span>
              <span className="pomo-goal-count">
                {dailyCount} / {sessionGoal}
              </span>
            </div>
            <div className="pomo-goal-track">
              <div
                className="pomo-goal-fill"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
            <div className="pomo-goal-pips">
              {Array.from({ length: Math.min(sessionGoal, 12) }).map((_, i) => (
                <div
                  key={i}
                  className={`pomo-pip ${i < dailyCount ? "done" : ""}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── settings ── */}
      <div className="pomo-panel">
        <button
          className="pomo-panel-header"
          onClick={() => setSettingsOpen((o) => !o)}
        >
          <span className="pomo-panel-label">settings</span>
          <span className={`pomo-panel-arrow ${settingsOpen ? "open" : ""}`}>
            ▾
          </span>
        </button>
        {settingsOpen && (
          <div className="pomo-panel-body pomo-settings-body">
            {/* duration sliders */}
            {Object.entries(MODES).map(([key, m]) => {
              const ef = effectiveDur[key];
              return (
                <div key={key} className="pomo-dur-group">
                  <span className="pomo-dur-group-label">{m.tag}</span>
                  <div className="pomo-slider-row">
                    <div className="pomo-slider-meta">
                      <span className="pomo-slider-label">focus</span>
                      <span className="pomo-slider-val">{ef.focus} min</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={120}
                      step={5}
                      value={ef.focus}
                      className="pomo-slider"
                      disabled={isActive}
                      onChange={(e) => setDur(key, "", e.target.value)}
                    />
                  </div>
                  <div className="pomo-slider-row">
                    <div className="pomo-slider-meta">
                      <span className="pomo-slider-label">break</span>
                      <span className="pomo-slider-val">{ef.breakDur} min</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={ef.breakDur}
                      className="pomo-slider"
                      disabled={isActive}
                      onChange={(e) => setDur(key, "_break", e.target.value)}
                    />
                  </div>
                </div>
              );
            })}

            {/* auto-advance */}
            <div
              className="pomo-toggle-row"
              role="switch"
              aria-checked={autoAdvance}
              tabIndex={0}
              onClick={() => setAutoAdvance((a) => !a)}
              onKeyDown={(e) => e.key === " " && setAutoAdvance((a) => !a)}
            >
              <div className="pomo-toggle-text">
                <span className="pomo-toggle-label">auto-advance</span>
                <span className="pomo-toggle-sub">
                  rolls into break without confirm
                </span>
              </div>
              <div className={`pomo-switch ${autoAdvance ? "on" : ""}`}>
                <div className="pomo-switch-thumb" />
              </div>
            </div>

            {/* completion sound */}
            <div
              className="pomo-toggle-row"
              role="switch"
              aria-checked={completeSnd}
              tabIndex={0}
              onClick={() => setCompleteSnd((s) => !s)}
              onKeyDown={(e) => e.key === " " && setCompleteSnd((s) => !s)}
            >
              <div className="pomo-toggle-text">
                <span className="pomo-toggle-label">completion sound</span>
                <span className="pomo-toggle-sub">chime when session ends</span>
              </div>
              <div className={`pomo-switch ${completeSnd ? "on" : ""}`}>
                <div className="pomo-switch-thumb" />
              </div>
            </div>

            {/* ambient */}
            <div className="pomo-ambient-section">
              <span className="pomo-slider-label">ambient</span>
              <div className="pomo-ambient-grid">
                {AMBIENT.map((track) => (
                  <button
                    key={track.id}
                    className={`pomo-ambient-btn ${ambientId === track.id ? "active" : ""}`}
                    onClick={() => setAmbientId(track.id)}
                  >
                    {track.label}
                  </button>
                ))}
              </div>
            </div>

            {/* daily goal slider */}
            <div className="pomo-slider-row" style={{ marginTop: "0.8rem" }}>
              <div className="pomo-slider-meta">
                <span className="pomo-slider-label">daily goal</span>
                <span className="pomo-slider-val">{sessionGoal} sessions</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                value={sessionGoal}
                className="pomo-slider"
                onChange={(e) => setSessionGoal(Number(e.target.value))}
              />
            </div>

            <button
              className="pomo-btn pomo-btn--stop"
              style={{
                marginTop: "0.8rem",
                fontSize: "0.7rem",
                alignSelf: "flex-start",
              }}
              onClick={() => setDailyCount(0)}
            >
              reset today's count
            </button>

            {isActive && (
              <p className="pomo-settings-hint">
                stop current session to edit durations.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="pomo-root">
      {leftCol}

      {/* desktop right column */}
      <div className="pomo-right-desktop">{rightCol}</div>

      {/* mobile drawer toggle */}
      <button
        className="pomo-drawer-toggle"
        onClick={() => setDrawerOpen((o) => !o)}
        aria-label="Toggle settings drawer"
      >
        {drawerOpen ? "✕ close" : "⚙ options"}
      </button>

      {/* mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="pomo-drawer-overlay"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="pomo-drawer" onClick={(e) => e.stopPropagation()}>
            {rightCol}
          </div>
        </div>
      )}
    </div>
  );
}

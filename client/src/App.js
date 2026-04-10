import { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";
import AuthPage from "./components/ui/AuthPage";
import ThemePanel from "./components/ui/ThemePanel";
import TrackerTab from "./components/tabs/TrackerTab";
import DailyTab from "./components/tabs/DailyTab";
import InsightsTab from "./components/tabs/InsightsTab";
import DnaTab from "./components/tabs/DnaTab";
import PomodoroTimer from "./components/pomodoro/PomodoroTimer";
import { useTheme } from "./hooks/useTheme";
import { useAuthFetch } from "./hooks/useAuthFetch";

// ── Date helpers ──────────────────────────────────────────────────────────────
const normDate = (d) => (typeof d === "string" ? d.slice(0, 10) : "");
const localDay = (d) => parseInt(normDate(d).split("-")[2], 10);
const localMonth = (d) => parseInt(normDate(d).split("-")[1], 10);
const localYear = (d) => parseInt(normDate(d).split("-")[0], 10);

const TRACKER_TABS = [
  { id: "tracker", label: "habit tracker", icon: "◎", section: "tracker" },
  { id: "daily", label: "daily log", icon: "▦", section: "tracker" },
  { id: "pomodoro", label: "focus timer", icon: "◉", section: "focus" }, // ← NEW
  {
    id: "insights",
    label: "insights & goals",
    icon: "◈",
    section: "analytics",
  },
  { id: "dna", label: "dna & correlations", icon: "⬡", section: "analytics" },
];

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });

  const [habits, setHabits] = useState([]);
  const [archivedHabits, setArchivedHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [activeTab, setActiveTab] = useState("tracker");
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [editColor, setEditColor] = useState("#888");

  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState("general");
  const [newHabitColor, setNewHabitColor] = useState("#888");

  const { theme, setTheme, filter, setFilter, uiMode, setUiMode } = useTheme();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setHabits([]);
    setArchivedHabits([]);
    setCompletions([]);
    setStreaks({});
  };

  const authFetch = useAuthFetch(token, logout);

  const handleAuth = (newToken, newUser) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const inFlight = useRef(new Set());

  useEffect(() => {
    if (!token) return;
    authFetch("/habits")
      .then((r) => r.json())
      .then((d) => setHabits(Array.isArray(d) ? d : []));
  }, [token, authFetch]);

  useEffect(() => {
    if (!token) return;
    authFetch("/habits/archived")
      .then((r) => r.json())
      .then((d) => setArchivedHabits(Array.isArray(d) ? d : []));
  }, [token, authFetch]);

  useEffect(() => {
    if (!token) return;
    authFetch(`/completions/${currentYear}/${currentMonth}`)
      .then((r) => r.json())
      .then((d) => setCompletions(Array.isArray(d) ? d : []));
  }, [currentMonth, currentYear, token, authFetch]);

  useEffect(() => {
    if (!token || habits.length === 0) return;
    authFetch("/streaks")
      .then((r) => r.json())
      .then((d) => setStreaks(d));
  }, [habits, token, authFetch]);

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    authFetch("/habits", {
      method: "POST",
      body: JSON.stringify({
        name: newHabitName,
        category: newHabitCategory,
        color: newHabitColor,
      }),
    })
      .then((r) => r.json())
      .then((created) => {
        setHabits((p) => [...p, created]);
        setNewHabitName("");
        setNewHabitCategory("general");
      });
  };

  const deleteHabit = (id) => {
    authFetch(`/habits/${id}/permanent`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => setHabits((p) => p.filter((h) => h.id !== id)))
      .catch(() => console.error("Delete failed"));
  };

  const archiveHabit = (id) => {
    authFetch(`/habits/${id}`, { method: "DELETE" }).then(() => {
      const removed = habits.find((h) => h.id === id);
      setHabits((p) => p.filter((h) => h.id !== id));
      if (removed)
        setArchivedHabits((p) => [
          ...p,
          { ...removed, archived_at: new Date().toISOString() },
        ]);
    });
  };

  const unarchiveHabit = (id) => {
    authFetch(`/habits/${id}/unarchive`, { method: "PATCH" })
      .then((r) => r.json())
      .then((restored) => {
        setArchivedHabits((p) => p.filter((h) => h.id !== id));
        setHabits((p) => [...p, restored]);
      });
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    authFetch(`/habits/${editingId}`, {
      method: "PUT",
      body: JSON.stringify({
        name: editName,
        category: editCategory,
        color: editColor,
      }),
    })
      .then((r) => r.json())
      .then((updated) => {
        setHabits(habits.map((h) => (h.id === editingId ? updated : h)));
        setEditingId(null);
        setEditName("");
        setEditCategory("general");
        setEditColor("#888");
      });
  };

  // ── toggleCompletion ──────────────────────────────────────────────────────
  const toggleCompletion = (habitId, day) => {
    const key = `${habitId}-${day}`;
    if (inFlight.current.has(key)) return;

    const date = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const existing = completions.find(
      (c) =>
        c.habit_id === habitId &&
        localDay(c.completed_date) === day &&
        localMonth(c.completed_date) === currentMonth &&
        localYear(c.completed_date) === currentYear,
    );

    if (existing?.id?.toString().startsWith("temp-")) return;

    inFlight.current.add(key);

    if (existing) {
      setCompletions((p) => p.filter((c) => c.id !== existing.id));
      authFetch(`/completions/${existing.id}`, { method: "DELETE" })
        .catch(() => {
          setCompletions((p) => [...p, existing]);
        })
        .finally(() => inFlight.current.delete(key));
    } else {
      const temp = {
        id: `temp-${habitId}-${day}`,
        habit_id: habitId,
        completed_date: date,
      };
      setCompletions((p) => [...p, temp]);

      authFetch("/completions", {
        method: "POST",
        body: JSON.stringify({ habit_id: habitId, completed_date: date }),
      })
        .then((r) => r.json())
        .then((saved) => {
          const normalised = {
            ...saved,
            completed_date: normDate(saved.completed_date) || date,
          };
          setCompletions((p) =>
            p.map((c) => (c.id === temp.id ? normalised : c)),
          );
        })
        .catch(() => {
          setCompletions((p) => p.filter((c) => c.id !== temp.id));
        })
        .finally(() => inFlight.current.delete(key));
    }
  };

  // ── pomodoro auto-completion: re-fetch completions + streaks ─────────────
  const handlePomodoroCompletion = () => {
    authFetch(`/completions/${currentYear}/${currentMonth}`)
      .then((r) => r.json())
      .then((d) => setCompletions(Array.isArray(d) ? d : []));
    authFetch("/streaks")
      .then((r) => r.json())
      .then((d) => setStreaks(d));
  };

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const habitStats = useMemo(
    () =>
      habits.map((habit) => ({
        name: habit.name,
        percent:
          (completions.filter((c) => c.habit_id === habit.id).length /
            daysInMonth) *
          100,
        streak: streaks[habit.id] ?? 0,
      })),
    [habits, completions, streaks, daysInMonth],
  );

  const overallPercent =
    habitStats.length === 0
      ? 0
      : habitStats.reduce((s, h) => s + h.percent, 0) / habitStats.length;
  const bestHabit =
    habitStats.length === 0
      ? null
      : habitStats.reduce((b, c) => (c.percent > b.percent ? c : b));
  const worstHabit =
    habitStats.length === 0
      ? null
      : habitStats.reduce((w, c) => (c.percent < w.percent ? c : w));

  if (!token) return <AuthPage onAuth={handleAuth} />;

  const editProps = {
    editingId,
    editName,
    setEditName,
    saveEdit,
    setEditingId,
    editCategory,
    setEditCategory,
    editColor,
    setEditColor,
  };
  const statsProps = {
    habitStats,
    overallPercent,
    bestHabit,
    worstHabit,
    completions,
    currentMonth,
    currentYear,
    daysInMonth,
  };

  const activeTabLabel =
    TRACKER_TABS.find((t) => t.id === activeTab)?.label ?? "";
  const displayName = user?.username || user?.first_name || user?.email || "";

  return (
    <div className="app-shell" data-sidebar={sidebarOpen ? "open" : "closed"}>
      {/* ── Navbar ── hamburger LEFT · ritual. CENTER · avatar+username RIGHT */}
      <header className="topnav">
        {/* LEFT — hamburger */}
        <div className="topnav-left">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle sidebar"
          >
            <span className={`hamburger-icon ${sidebarOpen ? "open" : ""}`}>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>

        {/* CENTER — brand (absolutely centered, pointer-events none) */}
        <div className="topnav-center">
          <span className="topnav-logo">ritual.</span>
        </div>

        {/* RIGHT — avatar + username */}
        <div className="topnav-right">
          <div className="topnav-avatar" title={user?.email}>
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <span className="topnav-user">{displayName}</span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="app-body">
        <aside
          className={`sidebar ${sidebarOpen ? "sidebar--open" : "sidebar--closed"}`}
        >
          <nav className="sidebar-nav">
            <div className="sidebar-section-label">tracker</div>
            {TRACKER_TABS.filter((t) => t.section === "tracker").map(
              ({ id, label, icon }) => (
                <button
                  key={id}
                  className={`sidebar-item ${activeTab === id ? "active" : ""}`}
                  onClick={() => setActiveTab(id)}
                >
                  <span className="sidebar-item-icon">{icon}</span>
                  <span className="sidebar-item-label">{label}</span>
                </button>
              ),
            )}

            {/* ── focus section ── */}
            <div
              className="sidebar-section-label"
              style={{ marginTop: "16px" }}
            >
              focus
            </div>
            {TRACKER_TABS.filter((t) => t.section === "focus").map(
              ({ id, label, icon }) => (
                <button
                  key={id}
                  className={`sidebar-item ${activeTab === id ? "active" : ""}`}
                  onClick={() => setActiveTab(id)}
                >
                  <span className="sidebar-item-icon">{icon}</span>
                  <span className="sidebar-item-label">{label}</span>
                </button>
              ),
            )}

            <div
              className="sidebar-section-label"
              style={{ marginTop: "16px" }}
            >
              analytics
            </div>
            {TRACKER_TABS.filter((t) => t.section === "analytics").map(
              ({ id, label, icon }) => (
                <button
                  key={id}
                  className={`sidebar-item ${activeTab === id ? "active" : ""}`}
                  onClick={() => setActiveTab(id)}
                >
                  <span className="sidebar-item-icon">{icon}</span>
                  <span className="sidebar-item-label">{label}</span>
                </button>
              ),
            )}
          </nav>

          <div className="sidebar-footer">
            <ThemePanel
              theme={theme}
              setTheme={setTheme}
              filter={filter}
              setFilter={setFilter}
              uiMode={uiMode}
              setUiMode={setUiMode}
            />
            <button className="logout-btn" onClick={logout}>
              logout
            </button>
          </div>
        </aside>

        <div className="main-content">
          <div className="page-header">
            <h2 className="page-title">{activeTabLabel}</h2>
          </div>
          <div className="page-body tab-content">
            {activeTab === "tracker" && (
              <TrackerTab
                habits={habits}
                archivedHabits={archivedHabits}
                archiveHabit={archiveHabit}
                deleteHabit={deleteHabit}
                unarchiveHabit={unarchiveHabit}
                newHabitName={newHabitName}
                setNewHabitName={setNewHabitName}
                addHabit={addHabit}
                newHabitCategory={newHabitCategory}
                setNewHabitCategory={setNewHabitCategory}
                newHabitColor={newHabitColor}
                setNewHabitColor={setNewHabitColor}
                toggleCompletion={toggleCompletion}
                setCurrentMonth={setCurrentMonth}
                setCurrentYear={setCurrentYear}
                {...editProps}
                {...statsProps}
              />
            )}
            {activeTab === "daily" && (
              <DailyTab habits={habits} {...statsProps} />
            )}
            {activeTab === "pomodoro" && ( // ← NEW
              <PomodoroTimer
                habits={habits.filter((h) => !h.archived_at)}
                token={token}
                onCompletion={handlePomodoroCompletion}
              />
            )}
            {activeTab === "insights" && (
              <InsightsTab habits={habits} {...statsProps} />
            )}
            {activeTab === "dna" && <DnaTab authFetch={authFetch} />}
          </div>
        </div>
      </div>

      {uiMode === "immersive" && (
        <button
          className="immersive-exit-btn"
          onClick={() => setUiMode("normal")}
        >
          exit immersive
        </button>
      )}
    </div>
  );
}

export default App;

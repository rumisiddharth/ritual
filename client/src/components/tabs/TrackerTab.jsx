import { useState } from "react";
import HabitForm from "../habits/HabitForm";
import HabitList from "../habits/HabitList";
import CompletionGrid from "../habits/CompletionGrid";

function SectionToggle({ open, onToggle, count, label, dim = false }) {
  const Arrow = () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? "rotate(0deg)" : "rotate(-90deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
  return (
    <div
      onClick={onToggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 14px",
        background: "var(--bg-card)",
        border: `0.5px solid ${dim ? "var(--border)" : "var(--border-mid)"}`,
        borderRadius: "6px",
        cursor: "pointer",
        userSelect: "none",
        opacity: dim ? 0.7 : 1,
        marginBottom: open ? "1rem" : 0,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          color: dim ? "var(--text-muted)" : "var(--accent)",
        }}
      >
        <Arrow />
      </span>
      <span
        style={{
          fontSize: "13px",
          color: dim ? "var(--text-dim)" : "var(--text-muted)",
        }}
      >
        <span style={{ color: dim ? "var(--text-muted)" : "var(--accent)" }}>
          {count}
        </span>{" "}
        {label}
      </span>
    </div>
  );
}

function TrackerTab({
  habits,
  archivedHabits,
  editingId,
  editName,
  setEditName,
  saveEdit,
  setEditingId,
  archiveHabit,
  deleteHabit,
  unarchiveHabit,
  editCategory,
  setEditCategory,
  editColor,
  setEditColor,
  newHabitName,
  setNewHabitName,
  addHabit,
  newHabitCategory,
  setNewHabitCategory,
  newHabitColor,
  setNewHabitColor,
  completions,
  currentMonth,
  currentYear,
  setCurrentMonth,
  setCurrentYear,
  toggleCompletion,
}) {
  const [habitsOpen, setHabitsOpen] = useState(true);
  const [archivedOpen, setArchivedOpen] = useState(false);

  return (
    <>
      <HabitForm
        newHabitName={newHabitName}
        setNewHabitName={setNewHabitName}
        addHabit={addHabit}
        newHabitCategory={newHabitCategory}
        setNewHabitCategory={setNewHabitCategory}
        newHabitColor={newHabitColor}
        setNewHabitColor={setNewHabitColor}
      />

      {/* ── Active habits ── */}
      <div style={{ marginBottom: "2rem" }}>
        <SectionToggle
          open={habitsOpen}
          onToggle={() => setHabitsOpen((o) => !o)}
          count={habits.length}
          label="active habits"
        />
        {habitsOpen && (
          <HabitList
            habits={habits}
            editingId={editingId}
            editName={editName}
            setEditName={setEditName}
            saveEdit={saveEdit}
            setEditingId={setEditingId}
            archiveHabit={archiveHabit}
            deleteHabit={deleteHabit}
            editCategory={editCategory}
            setEditCategory={setEditCategory}
            editColor={editColor}
            setEditColor={setEditColor}
          />
        )}
      </div>

      {/* ── Archived habits ── */}
      {archivedHabits.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <SectionToggle
            open={archivedOpen}
            onToggle={() => setArchivedOpen((o) => !o)}
            count={archivedHabits.length}
            label="archived habits"
            dim
          />
          {archivedOpen && (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {archivedHabits.map((habit) => (
                <li
                  key={habit.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "var(--bg-card)",
                    borderRadius: "8px",
                    border: "0.5px solid var(--border)",
                    opacity: 0.6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: habit.color || "#555",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "14px",
                        color: "var(--text-dim)",
                        fontFamily: "DM Mono, monospace",
                        textDecoration: "line-through",
                      }}
                    >
                      {habit.name}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#555",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {habit.category || "general"}
                    </span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => unarchiveHabit(habit.id)}
                  >
                    restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Completion grid ── */}
      <CompletionGrid
        habits={habits}
        completions={completions}
        currentMonth={currentMonth}
        currentYear={currentYear}
        setCurrentMonth={setCurrentMonth}
        setCurrentYear={setCurrentYear}
        toggleCompletion={toggleCompletion}
      />
    </>
  );
}

export default TrackerTab;

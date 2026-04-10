import { useState } from "react";
import HabitItem from "./HabitItem";
const CATEGORY_COLORS = {
  general: { bg: "#1e1e1e", text: "#555" },
  health: { bg: "#0f2e1e", text: "#1d9e75" },
  work: { bg: "#1a1400", text: "#c9b97a" },
  learning: { bg: "#1a1030", text: "#7f77dd" },
  fitness: { bg: "#2a1200", text: "#d85a30" },
  mindfulness: { bg: "#1a1a2e", text: "#378add" },
  social: { bg: "#2a1020", text: "#d4537e" },
};

function getCategoryStyle(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;
}

function HabitList({
  habits,
  editingId,
  editName,
  setEditName,
  saveEdit,
  setEditingId,
  deleteHabit,
  archiveHabit,
  editCategory,
  setEditCategory,
  editColor,
  setEditColor,
}) {
  const [filterCategory, setFilterCategory] = useState("all");

  const categories = [
    "all",
    ...new Set(habits.map((h) => h.category || "general")),
  ];
  const filtered =
    filterCategory === "all"
      ? habits
      : habits.filter((h) => (h.category || "general") === filterCategory);

  return (
    <>
      {habits.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          {categories.map((cat) => {
            const active = filterCategory === cat;
            const style = getCategoryStyle(cat);
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                style={{
                  background: active ? style.text : "transparent",
                  border: `0.5px solid ${active ? style.text : "#2e2e2e"}`,
                  borderRadius: "4px",
                  color: active ? "#0a0a0a" : style.text,
                  fontFamily: "DM Mono, monospace",
                  fontSize: "10px",
                  padding: "4px 10px",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  transition: "all 0.15s",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}
      <ul className="habit-list">
        {filtered.length === 0 ? (
          <p className="empty-state">no habits yet. add one above.</p>
        ) : (
          filtered.map((habit) => (
            <HabitItem
              key={habit.id}
              habit={habit}
              editingId={editingId}
              editName={editName}
              setEditName={setEditName}
              saveEdit={saveEdit}
              setEditingId={setEditingId}
              deleteHabit={deleteHabit}
              archiveHabit={archiveHabit}
              editCategory={editCategory}
              setEditCategory={setEditCategory}
              editColor={editColor}
              setEditColor={setEditColor}
              getCategoryStyle={getCategoryStyle}
            />
          ))
        )}
      </ul>
    </>
  );
}

export default HabitList;

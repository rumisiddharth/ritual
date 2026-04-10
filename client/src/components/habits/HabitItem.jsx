import { useState } from "react";
import { CATEGORIES } from "../../constants/categories";
function HabitItem({
  habit,
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
  getCategoryStyle,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const color = habit.color || "#888";
  const catStyle = getCategoryStyle(habit.category || "general");

  const handleEditClick = () => {
    setConfirmingDelete(false);
    setConfirmingArchive(false);
    setEditingId(habit.id);
    setEditName(habit.name);
    setEditCategory(habit.category || "general");
    setEditColor(habit.color || "#888");
  };

  return (
    <li className="habit-item">
      <div className="habit-item-left">
        <div className="habit-dot" style={{ background: color }} />

        {editingId === habit.id ? (
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              className="habit-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
              autoFocus
            />
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              style={{
                background: "var(--bg-card)",
                border: "0.5px solid #2e2e2e",
                borderRadius: "6px",
                color: "var(--accent)",
                fontFamily: "DM Mono, monospace",
                fontSize: "12px",
                padding: "6px 10px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-dim)",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                color
              </span>
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                style={{
                  width: "28px",
                  height: "28px",
                  border: "0.5px solid #2e2e2e",
                  borderRadius: "6px",
                  background: "none",
                  cursor: "pointer",
                  padding: "2px",
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="habit-name">{habit.name}</span>
            <span
              style={{
                fontSize: "10px",
                background: catStyle.bg,
                color: catStyle.text,
                borderRadius: "4px",
                padding: "2px 7px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              {habit.category || "general"}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {editingId === habit.id ? (
          <>
            <button className="add-btn" onClick={saveEdit}>
              save
            </button>
            <button
              className="delete-btn"
              onClick={() => {
                setEditingId(null);
                setEditName("");
              }}
            >
              cancel
            </button>
          </>
        ) : confirmingDelete ? (
          <>
            <span
              style={{
                fontSize: "11px",
                color: "#993C1D",
                fontFamily: "DM Mono, monospace",
                letterSpacing: "0.04em",
              }}
            >
              delete forever?
            </span>
            <button
              className="delete-btn"
              onClick={() => {
                deleteHabit(habit.id);
                setConfirmingDelete(false);
              }}
              style={{ borderColor: "#993C1D", color: "#993C1D" }}
            >
              yes
            </button>
            <button
              className="delete-btn"
              onClick={() => setConfirmingDelete(false)}
            >
              no
            </button>
          </>
        ) : confirmingArchive ? (
          <>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-dim)",
                fontFamily: "DM Mono, monospace",
                letterSpacing: "0.04em",
              }}
            >
              archive?
            </span>
            <button
              className="delete-btn"
              onClick={() => {
                archiveHabit(habit.id);
                setConfirmingArchive(false);
              }}
            >
              yes
            </button>
            <button
              className="delete-btn"
              onClick={() => setConfirmingArchive(false)}
            >
              no
            </button>
          </>
        ) : (
          <>
            <button className="delete-btn" onClick={handleEditClick}>
              edit
            </button>
            <button
              className="delete-btn"
              onClick={() => setConfirmingArchive(true)}
            >
              archive
            </button>
            <button
              className="delete-btn"
              onClick={() => setConfirmingDelete(true)}
              style={{ borderColor: "#993C1D", color: "#993C1D" }}
            >
              delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export default HabitItem;

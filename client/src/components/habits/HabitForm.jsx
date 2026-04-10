import {
  CATEGORIES,
  CATEGORY_DEFAULT_COLORS,
} from "../../constants/categories";
const PRESET_COLORS = [
  "#c9b97a",
  "#1d9e75",
  "#993c1d",
  "#378add",
  "#7f77dd",
  "#d4537e",
  "#d85a30",
  "#888888",
  "#4a9eff",
  "#e8c547",
  "#66bb6a",
  "#ef5350",
];

function HabitForm({
  newHabitName,
  setNewHabitName,
  addHabit,
  newHabitCategory,
  setNewHabitCategory,
  newHabitColor,
  setNewHabitColor,
}) {
  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setNewHabitCategory(cat);
    // Auto-suggest category color only if still on default gray
    if (newHabitColor === "#888888" || newHabitColor === "#888") {
      setNewHabitColor(CATEGORY_DEFAULT_COLORS[cat] || "#888888");
    }
  };

  return (
    <div style={{ marginBottom: "2rem" }}>
      {/* ── Row 1: text input + category select + add button ── */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "stretch",
          flexWrap: "wrap",
          marginBottom: "10px",
        }}
      >
        <input
          className="habit-input"
          style={{ flex: "1 1 200px", minWidth: "160px" }}
          value={newHabitName}
          onChange={(e) => setNewHabitName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addHabit()}
          placeholder="new habit..."
          autoComplete="off"
        />

        <select
          value={newHabitCategory}
          onChange={handleCategoryChange}
          style={{
            background: "var(--bg-card)",
            border: "0.5px solid var(--border-mid)",
            borderRadius: "6px",
            color: CATEGORY_DEFAULT_COLORS[newHabitCategory] || "var(--accent)",
            fontFamily: "DM Mono, monospace",
            fontSize: "12px",
            padding: "0 12px",
            outline: "none",
            cursor: "pointer",
            letterSpacing: "0.04em",
            height: "40px",
            transition: "border-color 0.15s, color 0.15s",
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          className="add-btn"
          onClick={addHabit}
          style={{ height: "40px", padding: "0 20px", flexShrink: 0 }}
        >
          + add
        </button>
      </div>

      {/* ── Row 2: color palette chips ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexWrap: "wrap",
        }}
      >
        {/* Current-color preview chip — read-only indicator */}
        <div
          title="selected color"
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: newHabitColor,
            flexShrink: 0,
            boxShadow: "0 0 0 2px var(--bg-card), 0 0 0 3.5px " + newHabitColor,
            marginRight: "2px",
          }}
        />

        <span
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: "10px",
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
            marginRight: "4px",
            userSelect: "none",
          }}
        >
          color
        </span>

        {PRESET_COLORS.map((color) => {
          const isSelected = newHabitColor === color;
          return (
            <button
              key={color}
              title={color}
              onClick={() => setNewHabitColor(color)}
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: color,
                border: "none",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
                transform: isSelected ? "scale(1.25)" : "scale(1)",
                boxShadow: isSelected
                  ? "0 0 0 2px var(--bg-card), 0 0 0 3.5px white"
                  : "none",
                transition: "transform 0.12s ease, box-shadow 0.12s ease",
                outline: "none",
              }}
              aria-label={`Select color ${color}`}
              aria-pressed={isSelected}
            />
          );
        })}
      </div>
    </div>
  );
}

export default HabitForm;

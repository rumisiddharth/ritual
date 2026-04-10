// ─── Shared category constants ────────────────────────────────────────────────
// Single source of truth. Previously duplicated across HabitList, HabitForm,
// and App.css. Update here and it propagates everywhere.

export const CATEGORIES = [
  "general",
  "health",
  "work",
  "learning",
  "fitness",
  "mindfulness",
  "social",
];

// Default color per category — used to auto-suggest color when adding a habit
export const CATEGORY_DEFAULT_COLORS = {
  general: "#555",
  health: "#1d9e75",
  work: "#c9b97a",
  learning: "#7f77dd",
  fitness: "#d85a30",
  mindfulness: "#378add",
  social: "#d4537e",
};

// Dark-theme background + text pairs for category badges
// Used by HabitList, HabitItem, and anywhere a badge is rendered
export const CATEGORY_BADGE_STYLES = {
  general: { bg: "#1e1e1e", text: "#555" },
  health: { bg: "#0f2e1e", text: "#1d9e75" },
  work: { bg: "#1a1400", text: "#c9b97a" },
  learning: { bg: "#1a1030", text: "#7f77dd" },
  fitness: { bg: "#2a1200", text: "#d85a30" },
  mindfulness: { bg: "#1a1a2e", text: "#378add" },
  social: { bg: "#2a1020", text: "#d4537e" },
};

/** Returns the badge style for a given category, falling back to "general" */
export function getCategoryStyle(cat) {
  return CATEGORY_BADGE_STYLES[cat] || CATEGORY_BADGE_STYLES.general;
}

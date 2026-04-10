function WeeklySummary({
  completions,
  habits,
  daysInMonth,
  currentMonth,
  currentYear,
}) {
  const weeks = [1, 2, 3, 4].map((week) => {
    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(week * 7, daysInMonth);
    const daysInWeek = endDay - startDay + 1;
    const totalPossible = daysInWeek * habits.length;
    if (totalPossible === 0) return { week, pct: 0, completed: 0, total: 0 };

    const completed = completions.filter((c) => {
      // FIX: timezone-safe split + month/year guard
      const d = parseInt(c.completed_date.split("-")[2], 10);
      const mon = parseInt(c.completed_date.split("-")[1], 10);
      const yr = parseInt(c.completed_date.split("-")[0], 10);
      return (
        d >= startDay &&
        d <= endDay &&
        mon === currentMonth &&
        yr === currentYear
      );
    }).length;

    return {
      week,
      pct: Math.round((completed / totalPossible) * 100),
      completed,
      total: totalPossible,
    };
  });

  const maxPct = Math.max(...weeks.map((w) => w.pct), 1);

  return (
    <div className="weekly-summary">
      <div className="section-title">weekly summary</div>
      <div className="weekly-grid">
        {weeks.map(({ week, pct, completed, total }) => {
          const accentColor =
            pct >= 70
              ? "var(--accent)"
              : pct >= 40
                ? "var(--text-muted)"
                : "var(--text-dim)";
          const barWidth = total === 0 ? 0 : (pct / maxPct) * 100;
          return (
            <div
              className="week-card"
              key={week}
              style={{
                flexDirection: "column",
                alignItems: "stretch",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span className="week-label">week {week}</span>
                <span className="week-pct" style={{ color: accentColor }}>
                  {pct}%
                </span>
              </div>
              <div
                style={{
                  height: "3px",
                  background: "var(--border)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${barWidth}%`,
                    background: accentColor,
                    borderRadius: "2px",
                    transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </div>
              {total > 0 && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-dim)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {completed}/{total}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeeklySummary;

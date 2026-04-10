function MonthlyStats({
  habitStats,
  completions,
  daysInMonth,
  currentMonth,
  currentYear,
}) {
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() + 1 === currentMonth &&
    today.getFullYear() === currentYear;
  const daysSoFar = isCurrentMonth ? today.getDate() : daysInMonth;

  const overallPct =
    habitStats.length === 0
      ? 0
      : habitStats.reduce((sum, s) => sum + s.percent, 0) / habitStats.length;

  const bestStreak =
    habitStats.length === 0
      ? 0
      : Math.max(...habitStats.map((s) => s.streak), 0);

  const totalPossible = daysSoFar * habitStats.length;
  const completionRate =
    totalPossible === 0
      ? 0
      : Math.round((completions.length / totalPossible) * 100);

  const stats = [
    {
      label: "overall completion",
      value: `${Math.round(overallPct)}%`,
      sub: `${completions.length} of ${totalPossible} possible`,
    },
    {
      label: isCurrentMonth ? "completion rate" : "final rate",
      value: `${completionRate}%`,
      sub: isCurrentMonth ? `${daysSoFar} days logged` : `full month`,
    },
    {
      label: "best streak",
      value: bestStreak === 0 ? "—" : `${bestStreak}d`,
      sub:
        bestStreak === 0
          ? "no streak yet"
          : bestStreak >= 7
            ? "on fire 🔥"
            : "keep going",
    },
  ];

  return (
    <div className="monthly-stats">
      {stats.map(({ label, value, sub }) => (
        <div className="stat-card" key={label}>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-dim)",
              marginTop: "4px",
              letterSpacing: "0.04em",
            }}
          >
            {sub}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MonthlyStats;

const HABIT_COLORS = [
  "#378ADD",
  "#1D9E75",
  "#D85A30",
  "#7F77DD",
  "#EF9F27",
  "#D4537E",
  "#639922",
  "#185FA5",
  "#993C1D",
  "#534AB7",
  "#0F6E56",
  "#BA7517",
  "#993556",
  "#3B6D11",
  "#D85A30",
];

// ── timezone-safe helpers ─────────────────────────────────────────────────────
const localDay = (d) => parseInt(d.split("-")[2], 10);
const localMonth = (d) => parseInt(d.split("-")[1], 10);
const localYear = (d) => parseInt(d.split("-")[0], 10);

function Analytics({
  habitStats,
  overallPercent,
  bestHabit,
  currentYear,
  currentMonth,
  completions,
  daysInMonth,
}) {
  // FIX: scope to current month/year before weekly slicing
  const monthCompletions = completions.filter(
    (c) =>
      localMonth(c.completed_date) === currentMonth &&
      localYear(c.completed_date) === currentYear,
  );

  const weeklyData = [1, 2, 3, 4].map((week) => {
    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(week * 7, daysInMonth);
    const totalPossible = (endDay - startDay + 1) * habitStats.length;
    if (totalPossible === 0) return 0;
    // FIX: use monthCompletions + localDay
    const completed = monthCompletions.filter((c) => {
      const d = localDay(c.completed_date);
      return d >= startDay && d <= endDay;
    }).length;
    return Math.round((completed / totalPossible) * 100);
  });

  const chartH = 100;
  const chartW = 260;
  const weekX = [30, 90, 150, 210];
  const points = weeklyData
    .map((v, i) => `${weekX[i]},${chartH - (v / 100) * chartH}`)
    .join(" ");
  const monthName = new Date(currentYear, currentMonth - 1)
    .toLocaleString("default", { month: "long" })
    .toUpperCase();

  return (
    <div className="analytics-section">
      <div className="analytics-header">
        <h2 className="analytics-title">analytics</h2>
        <span className="analytics-month">{monthName}</span>
      </div>

      <div className="charts-row">
        {/* Completion rates */}
        <div className="chart-card">
          <div className="chart-title">habit completion rates</div>
          {habitStats.length === 0 ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {[70, 45, 85, 30].map((w, i) => (
                <div key={i} className="skeleton-row">
                  <div
                    className="skeleton"
                    style={{
                      width: "90px",
                      height: "12px",
                      borderRadius: "3px",
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{ flex: 1, height: "6px", borderRadius: "3px" }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      width: "30px",
                      height: "12px",
                      borderRadius: "3px",
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {habitStats.map((stat, idx) => (
                <div
                  key={stat.name}
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <div
                    title={stat.name}
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      width: "110px",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {stat.name}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: "6px",
                      background: "var(--border)",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${stat.percent}%`,
                        background: HABIT_COLORS[idx % HABIT_COLORS.length],
                        borderRadius: "3px",
                        transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--text-dim)",
                      width: "38px",
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {Math.round(stat.percent)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly trend */}
        <div className="chart-card">
          <div className="chart-title">weekly progress trend</div>
          <div className="line-chart-wrap">
            <svg
              viewBox={`0 0 ${chartW + 40} ${chartH + 30}`}
              preserveAspectRatio="none"
            >
              {[0, 25, 50, 75, 100].map((v) => (
                <g key={v}>
                  <line
                    x1="28"
                    y1={chartH - (v / 100) * chartH}
                    x2={chartW + 10}
                    y2={chartH - (v / 100) * chartH}
                    stroke="var(--border)"
                    strokeWidth="0.5"
                  />
                  <text
                    x="24"
                    y={chartH - (v / 100) * chartH + 3}
                    fontSize="8"
                    fill="var(--text-dim)"
                    textAnchor="end"
                    fontFamily="DM Mono, monospace"
                  >
                    {v}%
                  </text>
                </g>
              ))}
              {weeklyData.length > 1 && (
                <polyline
                  points={points}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              )}
              {weeklyData.map((v, i) => (
                <g key={i}>
                  <circle
                    cx={weekX[i]}
                    cy={chartH - (v / 100) * chartH}
                    r="3.5"
                    fill="var(--bg-card)"
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                  />
                  <text
                    x={weekX[i]}
                    y={chartH + 14}
                    fontSize="9"
                    fill="var(--text-dim)"
                    textAnchor="middle"
                    fontFamily="DM Mono, monospace"
                  >
                    W{i + 1}
                  </text>
                  {v > 0 && (
                    <text
                      x={weekX[i]}
                      y={chartH - (v / 100) * chartH - 8}
                      fontSize="9"
                      fill="var(--accent)"
                      textAnchor="middle"
                      fontFamily="DM Mono, monospace"
                    >
                      {v}%
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>

          <div
            style={{
              borderTop: "0.5px solid var(--border)",
              marginTop: "1rem",
              paddingTop: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {[
              { label: "overall", value: `${overallPercent.toFixed(1)}%` },
              { label: "best habit", value: bestHabit ? bestHabit.name : "—" },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-dim)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--accent)",
                    maxWidth: "160px",
                    textAlign: "right",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;

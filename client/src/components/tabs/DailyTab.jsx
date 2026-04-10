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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── timezone-safe helpers ─────────────────────────────────────────────────────
const localDay = (d) => parseInt(d.split("-")[2], 10);
const localMonth = (d) => parseInt(d.split("-")[1], 10);
const localYear = (d) => parseInt(d.split("-")[0], 10);

function DailyTab({
  habits,
  completions,
  habitStats,
  overallPercent,
  currentMonth,
  currentYear,
  daysInMonth,
}) {
  // FIX: filter completions to current month/year before any day-level logic
  const monthCompletions = completions.filter(
    (c) =>
      localMonth(c.completed_date) === currentMonth &&
      localYear(c.completed_date) === currentYear,
  );

  const dailyLog = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    // FIX: use monthCompletions + localDay instead of new Date().getDate()
    const done = monthCompletions.filter(
      (c) => localDay(c.completed_date) === day,
    ).length;
    const pct =
      habits.length === 0 ? 0 : Math.round((done / habits.length) * 100);
    return { day, done, total: habits.length, pct };
  });

  const bestDay =
    dailyLog.length === 0
      ? null
      : dailyLog.reduce((b, d) => (d.pct > b.pct ? d : b));

  // FIX: today's count uses timezone-safe split + month/year guard
  const todayCount = (() => {
    const now = new Date();
    const todayDay = now.getDate();
    const todayMonth = now.getMonth() + 1;
    const todayYear = now.getFullYear();
    if (todayMonth !== currentMonth || todayYear !== currentYear) return null;
    const done = completions.filter(
      (c) =>
        localDay(c.completed_date) === todayDay &&
        localMonth(c.completed_date) === todayMonth &&
        localYear(c.completed_date) === todayYear,
    ).length;
    return `${done}/${habits.length}`;
  })();

  return (
    <div>
      <div className="monthly-stats">
        <div className="stat-card">
          <div className="stat-label">avg daily completion</div>
          <div className="stat-value">{Math.round(overallPercent)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">best day</div>
          <div className="stat-value">
            {!bestDay || bestDay.pct === 0
              ? "—"
              : `${new Date(
                  currentYear,
                  currentMonth - 1,
                  bestDay.day,
                ).toLocaleString("default", {
                  month: "short",
                })} ${bestDay.day}`}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">habits done today</div>
          <div className="stat-value">{todayCount ?? "—"}</div>
        </div>
      </div>

      <div className="charts-row" style={{ marginBottom: "1.5rem" }}>
        <div className="chart-card">
          <div className="chart-title">daily completion over time</div>
          <div className="line-chart-wrap">
            <svg
              viewBox="0 0 320 120"
              preserveAspectRatio="none"
              style={{ width: "100%", height: "120px" }}
            >
              {[0, 50, 100].map((v) => (
                <line
                  key={v}
                  x1="0"
                  y1={100 - v}
                  x2="320"
                  y2={100 - v}
                  stroke="var(--border)"
                  strokeWidth="0.5"
                />
              ))}
              <polyline
                points={dailyLog
                  .map(
                    (d, i) =>
                      `${(i / (daysInMonth - 1)) * 300 + 10},${100 - d.pct}`,
                  )
                  .join(" ")}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.5"
              />
              {[1, 8, 15, 22, daysInMonth].map((d) => (
                <text
                  key={d}
                  x={((d - 1) / (daysInMonth - 1)) * 300 + 10}
                  y="115"
                  fontSize="8"
                  fill="var(--text-dim)"
                  textAnchor="middle"
                  fontFamily="DM Mono, monospace"
                >
                  {d}
                </text>
              ))}
            </svg>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">top 5 habits</div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {[...habitStats]
              .sort((a, b) => b.percent - a.percent)
              .slice(0, 5)
              .map((s) => (
                <div
                  key={s.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                    }}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background:
                          HABIT_COLORS[
                            habits.findIndex((h) => h.name === s.name) %
                              HABIT_COLORS.length
                          ],
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    {Math.round(s.percent)}%
                  </span>
                </div>
              ))}
            {habitStats.length === 0 && (
              <p style={{ fontSize: "13px", color: "var(--text-dim)" }}>
                no habits yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">day-by-day log</div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr>
                {["day", "date", "habits done", "completion"].map((h) => (
                  <th
                    key={h}
                    style={{
                      fontSize: "11px",
                      color: "var(--text-dim)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "8px 10px",
                      borderBottom: "0.5px solid var(--border-mid)",
                      textAlign: h === "day" || h === "date" ? "left" : "right",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dailyLog.map(({ day, done, total, pct }) => (
                <tr
                  key={day}
                  style={{ borderBottom: "0.5px solid var(--border)" }}
                >
                  <td
                    style={{ padding: "7px 10px", color: "var(--text-muted)" }}
                  >
                    {
                      DAY_LABELS[
                        new Date(currentYear, currentMonth - 1, day).getDay()
                      ]
                    }
                  </td>
                  <td
                    style={{ padding: "7px 10px", color: "var(--text-muted)" }}
                  >
                    {new Date(
                      currentYear,
                      currentMonth - 1,
                      day,
                    ).toLocaleString("default", { month: "short" })}{" "}
                    {day}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      color: "var(--text-muted)",
                      textAlign: "right",
                    }}
                  >
                    {done}/{total}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      color: "var(--accent)",
                      textAlign: "right",
                    }}
                  >
                    {pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DailyTab;

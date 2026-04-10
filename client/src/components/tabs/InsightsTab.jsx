import MonthlyStats from "../analytics/MonthlyStats";
import WeeklySummary from "../analytics/WeeklySummary";
import Analytics from "../analytics/Analytics";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const localDay = (d) => parseInt(d.split("-")[2], 10);
const localMonth = (d) => parseInt(d.split("-")[1], 10);
const localYear = (d) => parseInt(d.split("-")[0], 10);

function InsightsTab({
  habits,
  completions,
  habitStats,
  overallPercent,
  bestHabit,
  worstHabit,
  currentMonth,
  currentYear,
  daysInMonth,
}) {
  const monthCompletions = completions.filter(
    (c) =>
      localMonth(c.completed_date) === currentMonth &&
      localYear(c.completed_date) === currentYear,
  );

  const dailyLog = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const done = monthCompletions.filter(
      (c) => localDay(c.completed_date) === day,
    ).length;
    const pct =
      habits.length === 0 ? 0 : Math.round((done / habits.length) * 100);
    return { day, done, total: habits.length, pct };
  });

  const maxStreak =
    habitStats.length === 0
      ? 0
      : Math.max(...habitStats.map((s) => s.streak), 0);

  return (
    <div>
      <MonthlyStats
        habitStats={habitStats}
        completions={completions}
        daysInMonth={daysInMonth}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />
      <WeeklySummary
        completions={completions}
        habits={habits}
        daysInMonth={daysInMonth}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />
      <Analytics
        habitStats={habitStats}
        overallPercent={overallPercent}
        bestHabit={bestHabit}
        currentYear={currentYear}
        currentMonth={currentMonth}
        completions={completions}
        daysInMonth={daysInMonth}
      />
      <div className="charts-row" style={{ marginBottom: "1.5rem" }}>
        <div className="chart-card">
          <div className="chart-title">performance summary</div>
          {[
            {
              label: "best performing habit",
              value: bestHabit ? bestHabit.name : "—",
            },
            {
              label: "needs improvement",
              value: worstHabit ? worstHabit.name : "—",
            },
            {
              label: "average completion",
              value: `${Math.round(overallPercent)}%`,
            },
            {
              label: "longest streak",
              value: habitStats.length === 0 ? "—" : `${maxStreak} days`,
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "0.5px solid var(--border)",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text-dim)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </span>
              <span style={{ fontSize: "14px", color: "var(--accent)" }}>
                {value}
              </span>
            </div>
          ))}
        </div>
        <div className="chart-card">
          <div className="chart-title">week-by-week comparison</div>
          <div className="line-chart-wrap">
            <svg
              viewBox="0 0 300 120"
              style={{ width: "100%", height: "120px" }}
              preserveAspectRatio="none"
            >
              {[1, 2, 3, 4].map((week) => {
                const startDay = (week - 1) * 7 + 1;
                const endDay = Math.min(week * 7, daysInMonth);
                const totalPossible = (endDay - startDay + 1) * habits.length;
                const completed =
                  totalPossible === 0
                    ? 0
                    : monthCompletions.filter((c) => {
                        const d = localDay(c.completed_date);
                        return d >= startDay && d <= endDay;
                      }).length;
                const pct =
                  totalPossible === 0
                    ? 0
                    : Math.round((completed / totalPossible) * 100);
                const x = 20 + (week - 1) * 70;
                const barH = (pct / 100) * 90;
                return (
                  <g key={week}>
                    <rect
                      x={x}
                      y={100 - barH}
                      width="40"
                      height={barH}
                      fill="var(--accent)"
                      opacity="0.7"
                      rx="2"
                    />
                    <text
                      x={x + 20}
                      y="113"
                      fontSize="9"
                      fill="var(--text-dim)"
                      textAnchor="middle"
                      fontFamily="DM Mono, monospace"
                    >
                      W{week}
                    </text>
                    <text
                      x={x + 20}
                      y={Math.max(95 - barH, 12)}
                      fontSize="9"
                      fill="var(--accent)"
                      textAnchor="middle"
                      fontFamily="DM Mono, monospace"
                    >
                      {pct}%
                    </text>
                  </g>
                );
              })}
              <line
                x1="0"
                y1="100"
                x2="300"
                y2="100"
                stroke="var(--border)"
                strokeWidth="0.5"
              />
            </svg>
          </div>
        </div>
      </div>
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">monthly goals</div>
          {[
            {
              text: "Reach 80% overall completion",
              met: overallPercent >= 80,
              status: `currently at ${Math.round(overallPercent)}%`,
            },
            {
              text: "Complete all habits for 7 consecutive days",
              met: maxStreak >= 7,
              status: `best streak: ${maxStreak} days`,
            },
            {
              text: "No day with less than 50% completion",
              met: dailyLog.every((d) => d.total === 0 || d.pct >= 50),
              status: dailyLog.every((d) => d.total === 0 || d.pct >= 50)
                ? "achieved"
                : "not yet",
            },
            {
              text: "Improve worst habit by 20%",
              met: false,
              status: "in progress",
            },
          ].map(({ text, met, status }) => (
            <div
              key={text}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 0",
                borderBottom: "0.5px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  border: `0.5px solid ${met ? "var(--teal)" : "var(--border-mid)"}`,
                  borderRadius: "3px",
                  background: met ? "var(--teal)" : "transparent",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              />
              <div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  {text}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: met ? "var(--teal)" : "var(--text-dim)",
                    marginTop: "3px",
                  }}
                >
                  {status}
                </div>
              </div>
            </div>
          ))}
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
                        textAlign:
                          h === "day" || h === "date" ? "left" : "right",
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
                      style={{
                        padding: "7px 10px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {
                        DAY_LABELS[
                          new Date(currentYear, currentMonth - 1, day).getDay()
                        ]
                      }
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        color: "var(--text-muted)",
                      }}
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
    </div>
  );
}

export default InsightsTab;

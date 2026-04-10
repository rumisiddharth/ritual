// ── helpers ───────────────────────────────────────────────────────────────────
// completed_date from Postgres can come back as "2026-04-08T00:00:00.000Z"
// (ISO string) or "2026-04-08" (date-only string) depending on the driver.
// Always normalise to the date-only prefix before splitting.
const normDate = (d) => (typeof d === "string" ? d.slice(0, 10) : "");
const localDay = (d) => parseInt(normDate(d).split("-")[2], 10);
const localMonth = (d) => parseInt(normDate(d).split("-")[1], 10);
const localYear = (d) => parseInt(normDate(d).split("-")[0], 10);

function CompletionGrid({
  habits,
  completions,
  currentMonth,
  currentYear,
  setCurrentMonth,
  setCurrentYear,
  toggleCompletion,
}) {
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const today = new Date();
  const todayDay   = today.getDate();
  const todayMonth = today.getMonth() + 1;
  const todayYear  = today.getFullYear();

  const isCurrentMonth = todayMonth === currentMonth && todayYear === currentYear;

  // True if the displayed month/year is entirely in the future
  const isFutureMonth =
    currentYear > todayYear ||
    (currentYear === todayYear && currentMonth > todayMonth);

  // True for any day that hasn't happened yet
  const isFutureDay = (day) => isFutureMonth || (isCurrentMonth && day > todayDay);

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Pre-filter completions to current month/year once — avoids O(n) per cell
  const monthCompletions = completions.filter(
    (c) =>
      localMonth(c.completed_date) === currentMonth &&
      localYear(c.completed_date) === currentYear,
  );

  return (
    <div className="grid-section">
      <div className="grid-nav">
        <button className="nav-btn" onClick={prevMonth}>
          ←
        </button>
        <span className="grid-month">
          {new Date(currentYear, currentMonth - 1)
            .toLocaleString("default", { month: "long" })
            .toUpperCase()}{" "}
          {currentYear}
        </span>
        <button className="nav-btn" onClick={nextMonth}>
          →
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="empty-state">add a habit above to start tracking.</div>
      ) : (
        <div className="grid-table-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th
                  className="grid-habit-cell"
                  style={{ borderBottom: "0.5px solid var(--border)" }}
                />
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                  (day) => (
                    <th
                      key={day}
                      className="grid-day-header"
                      style={
                        isCurrentMonth && day === todayDay
                          ? {
                              color: "var(--accent)",
                              borderBottom: "1.5px solid var(--accent)",
                            }
                          : {}
                      }
                    >
                      {day}
                    </th>
                  ),
                )}
                <th className="grid-pct-header">done</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => {
                const color = habit.color || "#888";

                // Use pre-filtered monthCompletions for percentage — correct month only
                const habitMonthCompletions = monthCompletions.filter(
                  (c) => c.habit_id === habit.id,
                );
                const pct = Math.round(
                  (habitMonthCompletions.length / daysInMonth) * 100,
                );

                return (
                  <tr key={habit.id}>
                    <td className="grid-habit-cell">
                      <div className="grid-habit-name-inner">
                        <span
                          className="habit-dot"
                          style={{ background: color }}
                        />
                        {habit.name}
                      </div>
                    </td>

                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                      (day) => {
                        const future = isFutureDay(day);
                        const done =
                          !future &&
                          habitMonthCompletions.some(
                            (c) => localDay(c.completed_date) === day,
                          );
                        const isToday = isCurrentMonth && day === todayDay;

                        return (
                          <td
                            key={day}
                            className={`grid-cell${done ? " completed" : ""}`}
                            style={{
                              background: done ? color : "transparent",
                              outline:
                                isToday && !done
                                  ? `1px solid ${color}44`
                                  : "none",
                              outlineOffset: "-1px",
                              opacity: future ? 0.35 : 1,
                              // ── FUTURE GUARD ─────────────────────────────
                              cursor: future ? "not-allowed" : "pointer",
                              pointerEvents: future ? "none" : "auto",
                            }}
                            onClick={
                              future
                                ? undefined
                                : () => toggleCompletion(habit.id, day)
                            }
                            title={
                              future
                                ? "can't log future dates"
                                : `${habit.name} — ${new Date(
                                    currentYear,
                                    currentMonth - 1,
                                    day,
                                  ).toLocaleDateString("default", {
                                    month: "short",
                                    day: "numeric",
                                  })}`
                            }
                          />
                        );
                      },
                    )}

                    <td className="grid-pct-cell">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CompletionGrid;
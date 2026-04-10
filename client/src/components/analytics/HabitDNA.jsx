import { useState, useEffect } from "react";

const DNA_DIMENSIONS = [
  {
    key: "consistency",
    label: "consistency",
    low: "sporadic",
    high: "rock solid",
    description: "overall completion rate over 90 days",
  },
  {
    key: "momentum",
    label: "momentum",
    low: "fading",
    high: "building",
    description: "last 30 days vs previous 30 days",
  },
  {
    key: "recoveryScore",
    label: "recovery",
    low: "slow to bounce back",
    high: "bounces back fast",
    description: "how quickly you resume after missing a day",
  },
  {
    key: "burstScore",
    label: "rhythm",
    low: "steady & daily",
    high: "burst performer",
    description: "consistent daily vs big-push weeks",
  },
  {
    key: "weekendBias",
    label: "timing",
    low: "weekday grinder",
    high: "weekend warrior",
    description: "when in the week you're most active",
  },
];

function RadarChart({ dna, color }) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const keys = DNA_DIMENSIONS.map((d) => d.key);
  const n = keys.length;

  const points = keys.map((key, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const val = (dna[key] ?? 50) / 100;
    return {
      x: cx + r * val * Math.cos(angle),
      y: cy + r * val * Math.sin(angle),
      lx: cx + (r + 18) * Math.cos(angle),
      ly: cy + (r + 18) * Math.sin(angle),
    };
  });

  // Grid rings at 25, 50, 75, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  const polyPath =
    points
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
      )
      .join(" ") + " Z";

  const labelAbbrev = ["C", "M", "R", "Rh", "T"];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: "100%", maxWidth: "160px" }}
    >
      {rings.map((ring) => {
        const rpts = keys.map((_, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          return `${(cx + r * ring * Math.cos(angle)).toFixed(1)},${(cy + r * ring * Math.sin(angle)).toFixed(1)}`;
        });
        return (
          <polygon
            key={ring}
            points={rpts.join(" ")}
            fill="none"
            stroke="#2a2a2a"
            strokeWidth="0.5"
          />
        );
      })}
      {keys.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={(cx + r * Math.cos(angle)).toFixed(1)}
            y2={(cy + r * Math.sin(angle)).toFixed(1)}
            stroke="#2a2a2a"
            strokeWidth="0.5"
          />
        );
      })}
      <path
        d={polyPath}
        fill={color}
        fillOpacity="0.15"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
      ))}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.lx}
          y={p.ly + 3}
          fontSize="7"
          fill="#555"
          textAnchor="middle"
          fontFamily="DM Mono, monospace"
        >
          {labelAbbrev[i]}
        </text>
      ))}
    </svg>
  );
}

function DNABar({ value, color }) {
  return (
    <div
      style={{
        position: "relative",
        height: "4px",
        background: "var(--border)",
        borderRadius: "2px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: `${value}%`,
          background: color,
          borderRadius: "2px",
          transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
    </div>
  );
}

function getArchetype(dna) {
  const { consistency, momentum, recoveryScore, burstScore, weekendBias } = dna;
  if (consistency >= 75 && burstScore < 40)
    return { label: "iron habit", desc: "you show up every single day" };
  if (momentum >= 70 && consistency < 60)
    return {
      label: "rising star",
      desc: "rapidly improving, on an upward curve",
    };
  if (burstScore >= 70)
    return { label: "sprint mode", desc: "intense weeks followed by recovery" };
  if (recoveryScore >= 80 && consistency < 70)
    return {
      label: "resilient",
      desc: "you miss days but always come back fast",
    };
  if (weekendBias >= 70)
    return {
      label: "weekend warrior",
      desc: "your streak lives on saturdays & sundays",
    };
  if (weekendBias <= 30)
    return { label: "9-to-5 habit", desc: "you thrive on weekday structure" };
  if (consistency < 30)
    return {
      label: "just starting",
      desc: "building the foundation — keep going",
    };
  return { label: "balanced", desc: "steady across all dimensions" };
}

function HabitCard({ habit, expanded, onToggle }) {
  const archetype = getArchetype(habit.dna);
  const accentColor = habit.color || "#c9b97a";

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: `0.5px solid ${expanded ? accentColor + "55" : "#222"}`,
        borderRadius: "8px",
        overflow: "hidden",
        transition: "border-color 0.2s",
        cursor: "pointer",
      }}
      onClick={onToggle}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: accentColor,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {habit.name}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            {archetype.label}
            <span style={{ color: "var(--text-faint)", margin: "0 6px" }}>
              ·
            </span>
            {habit.totalCompleted} days in 90
          </div>
        </div>
        {/* Mini consistency bar */}
        <div style={{ width: "48px", flexShrink: 0 }}>
          <DNABar value={habit.dna.consistency} color={accentColor} />
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              textAlign: "right",
              marginTop: "3px",
            }}
          >
            {habit.dna.consistency}%
          </div>
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-dim)",
            marginLeft: "4px",
          }}
        >
          {expanded ? "▴" : "▾"}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            borderTop: "0.5px solid #1e1e1e",
            padding: "16px",
            display: "grid",
            gridTemplateColumns: "160px 1fr",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <RadarChart dna={habit.dna} color={accentColor} />
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                textAlign: "center",
                letterSpacing: "0.06em",
              }}
            >
              C · M · R · Rh · T
            </div>
          </div>
          <div>
            <div
              style={{
                background: "#0e0e0e",
                border: `0.5px solid ${accentColor}33`,
                borderRadius: "6px",
                padding: "10px 12px",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                archetype
              </div>
              <div style={{ fontSize: "13px", color: accentColor }}>
                {archetype.label}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginTop: "2px",
                }}
              >
                {archetype.desc}
              </div>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {DNA_DIMENSIONS.map((dim) => {
                const val = habit.dna[dim.key] ?? 50;
                return (
                  <div key={dim.key}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "5px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {dim.label}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color:
                            val >= 60
                              ? accentColor
                              : val <= 40
                                ? "#555"
                                : "#888",
                        }}
                      >
                        {val <= 30
                          ? dim.low
                          : val >= 70
                            ? dim.high
                            : "balanced"}
                      </span>
                    </div>
                    <div
                      style={{
                        position: "relative",
                        height: "3px",
                        background: "var(--border)",
                        borderRadius: "2px",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          height: "100%",
                          width: `${val}%`,
                          background: `linear-gradient(to right, #2a2a2a, ${accentColor})`,
                          borderRadius: "2px",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--text-faint)",
                        marginTop: "3px",
                      }}
                    >
                      {dim.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HabitDNA({ authFetch }) {
  const [dnaData, setDnaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    setLoading(true);
    authFetch("/habit-dna")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDnaData(data);
        else setError("Failed to load DNA data");
        setLoading(false);
      })
      .catch(() => {
        setError("Could not connect to server");
        setLoading(false);
      });
  }, [authFetch]);

  if (loading) {
    return (
      <div
        style={{
          padding: "3rem 0",
          textAlign: "center",
          color: "var(--text-faint)",
          fontSize: "12px",
          letterSpacing: "0.08em",
        }}
      >
        analysing your habits...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem 0", color: "#8b3535", fontSize: "12px" }}>
        {error}
      </div>
    );
  }

  if (dnaData.length === 0) {
    return (
      <div
        style={{
          padding: "3rem 0",
          textAlign: "center",
          color: "var(--text-faint)",
          fontSize: "12px",
          letterSpacing: "0.08em",
        }}
      >
        no habits to analyse yet. add habits and log them for a few weeks.
      </div>
    );
  }

  // Sort by consistency descending
  const sorted = [...dnaData].sort(
    (a, b) => b.dna.consistency - a.dna.consistency,
  );

  return (
    <div>
      {/* Legend */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "8px",
          marginBottom: "1.5rem",
        }}
      >
        {DNA_DIMENSIONS.map((dim) => (
          <div
            key={dim.key}
            style={{
              background: "var(--bg-card)",
              border: "0.5px solid #222",
              borderRadius: "6px",
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-dim)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              {dim.label}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-faint)",
                lineHeight: 1.4,
              }}
            >
              {dim.description}
            </div>
          </div>
        ))}
      </div>

      {/* Habit cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {sorted.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            expanded={expandedId === habit.id}
            onToggle={() =>
              setExpandedId(expandedId === habit.id ? null : habit.id)
            }
          />
        ))}
      </div>
    </div>
  );
}

export default HabitDNA;

import { useState, useEffect, useCallback } from "react";

function strengthLabel(phi) {
  const abs = Math.abs(phi);
  if (abs >= 0.6) return phi > 0 ? "always together" : "never together";
  if (abs >= 0.4) return phi > 0 ? "strong link" : "strong inverse";
  if (abs >= 0.2) return phi > 0 ? "mild link" : "mild inverse";
  return "no link";
}

function strengthColor(phi) {
  if (phi >= 0.4) return "#1D9E75";
  if (phi >= 0.2) return "#c9b97a";
  if (phi <= -0.4) return "#993C1D";
  if (phi <= -0.2) return "#555";
  return "#333";
}

function PhiBar({ phi }) {
  const pct = Math.abs(phi) * 100;
  const color = strengthColor(phi);
  const isNeg = phi < 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        minWidth: "120px",
      }}
    >
      <div
        style={{
          width: "50px",
          height: "4px",
          background: "var(--border)",
          borderRadius: "2px",
          overflow: "hidden",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        {isNeg && (
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: color,
              borderRadius: "2px",
            }}
          />
        )}
      </div>
      <div
        style={{
          width: "1px",
          height: "10px",
          background: "#2e2e2e",
          flexShrink: 0,
        }}
      />
      <div
        style={{
          width: "50px",
          height: "4px",
          background: "var(--border)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        {!isNeg && (
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: color,
              borderRadius: "2px",
            }}
          />
        )}
      </div>
    </div>
  );
}

function MatrixCell({ phi, size = 28 }) {
  if (phi === null) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background: "#111",
          borderRadius: "3px",
        }}
      />
    );
  }
  if (phi === 1) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background: "var(--border)",
          borderRadius: "3px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            background: "#333",
          }}
        />
      </div>
    );
  }
  const intensity = Math.abs(phi);
  const alpha = 0.1 + intensity * 0.8;
  const bg =
    phi >= 0
      ? `rgba(29, 158, 117, ${alpha.toFixed(2)})`
      : `rgba(153, 60, 29, ${alpha.toFixed(2)})`;

  return (
    <div
      title={`φ = ${phi.toFixed(2)}`}
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: "3px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "default",
      }}
    >
      <span
        style={{
          fontSize: "7px",
          color: intensity > 0.4 ? "rgba(255,255,255,0.6)" : "transparent",
          fontFamily: "DM Mono, monospace",
        }}
      >
        {phi.toFixed(1)}
      </span>
    </div>
  );
}

// Formats a UTC timestamp into a human-readable age string
function timeAgo(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function CorrelationEngine({ authFetch }) {
  const [correlations, setCorrelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [refreshError, setRefreshError] = useState(null);
  const [computedAt, setComputedAt] = useState(null);
  const [view, setView] = useState("list");
  const [filter, setFilter] = useState("all");

  const loadCorrelations = useCallback(() => {
    setLoading(true);
    setError(null);
    authFetch("/correlations")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCorrelations(data);
          // Use computed_at from the first row as the batch timestamp
          if (data.length > 0 && data[0].computed_at) {
            setComputedAt(data[0].computed_at);
          }
        } else {
          setError("Failed to load correlations");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Could not connect to server");
        setLoading(false);
      });
  }, [authFetch]);

  useEffect(() => {
    loadCorrelations();
  }, [loadCorrelations]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await authFetch("/correlations/refresh", { method: "POST" });
      const data = await res.json();
      if (res.status === 429) {
        setRefreshError(data.error);
        setRefreshing(false);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Refresh failed");
      // Reload fresh data
      loadCorrelations();
    } catch (err) {
      setRefreshError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

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
        loading correlations...
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

  if (correlations.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          padding: "3rem 0",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "var(--text-faint)",
            fontSize: "12px",
            letterSpacing: "0.08em",
          }}
        >
          need at least 2 habits with overlapping completions to compute
          correlations.
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            background: "transparent",
            border: "0.5px solid #2e2e2e",
            borderRadius: "4px",
            color: "#555",
            fontFamily: "DM Mono, monospace",
            fontSize: "11px",
            padding: "6px 14px",
            cursor: "pointer",
          }}
        >
          {refreshing ? "computing..." : "try recomputing"}
        </button>
      </div>
    );
  }

  // Build matrix data
  const habitIds = [
    ...new Set(correlations.flatMap((c) => [c.habit_a.id, c.habit_b.id])),
  ];
  const habitMap = {};
  correlations.forEach((c) => {
    habitMap[c.habit_a.id] = c.habit_a;
    habitMap[c.habit_b.id] = c.habit_b;
  });
  const phiMap = {};
  correlations.forEach((c) => {
    phiMap[`${c.habit_a.id}-${c.habit_b.id}`] = c.phi;
    phiMap[`${c.habit_b.id}-${c.habit_a.id}`] = c.phi;
  });

  const filtered = correlations.filter((c) => {
    if (filter === "positive") return c.phi >= 0.2;
    if (filter === "negative") return c.phi <= -0.2;
    return true;
  });

  const strongest = [...correlations].sort(
    (a, b) => Math.abs(b.phi) - Math.abs(a.phi),
  )[0];

  return (
    <div>
      {/* Top insight banner */}
      {strongest && Math.abs(strongest.phi) >= 0.2 && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "0.5px solid #222",
            borderRadius: "8px",
            padding: "14px 16px",
            marginBottom: "1.5rem",
            display: "flex",
            gap: "14px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: strengthColor(strongest.phi),
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-dim)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              strongest link
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
              <span style={{ color: strongest.habit_a.color || "#c9b97a" }}>
                {strongest.habit_a.name}
              </span>
              <span style={{ color: "var(--text-faint)", margin: "0 8px" }}>
                {strongest.phi > 0 ? "↔" : "⊗"}
              </span>
              <span style={{ color: strongest.habit_b.color || "#c9b97a" }}>
                {strongest.habit_b.name}
              </span>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "3px",
              }}
            >
              done together {strongest.overlap_pct}% of the time · φ ={" "}
              {strongest.phi.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Controls row: view toggle + filter + refresh */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          {["list", "matrix"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                background: view === v ? "#1a1800" : "transparent",
                border: `0.5px solid ${view === v ? "#c9b97a" : "#2e2e2e"}`,
                borderRadius: "4px",
                color: view === v ? "#c9b97a" : "#555",
                fontFamily: "DM Mono, monospace",
                fontSize: "11px",
                padding: "5px 12px",
                cursor: "pointer",
                letterSpacing: "0.05em",
              }}
            >
              {v}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Stale data indicator */}
          {computedAt && (
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-faint)",
                letterSpacing: "0.06em",
              }}
            >
              computed {timeAgo(computedAt)}
            </span>
          )}

          {/* Manual refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Recompute correlation data now"
            style={{
              background: "transparent",
              border: "0.5px solid #2e2e2e",
              borderRadius: "4px",
              color: refreshing ? "#333" : "#555",
              fontFamily: "DM Mono, monospace",
              fontSize: "10px",
              padding: "4px 10px",
              cursor: refreshing ? "not-allowed" : "pointer",
              letterSpacing: "0.05em",
              transition: "border-color 0.15s, color 0.15s",
            }}
          >
            {refreshing ? "computing..." : "↻ refresh"}
          </button>

          <div style={{ display: "flex", gap: "6px" }}>
            {["all", "positive", "negative"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: "none",
                  border: `0.5px solid ${filter === f ? "#444" : "#1e1e1e"}`,
                  borderRadius: "4px",
                  color: filter === f ? "#888" : "#333",
                  fontFamily: "DM Mono, monospace",
                  fontSize: "10px",
                  padding: "4px 10px",
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Refresh error */}
      {refreshError && (
        <div
          style={{
            fontSize: "11px",
            color: "#8b3535",
            background: "#1a0a0a",
            border: "0.5px solid #3a1515",
            borderRadius: "6px",
            padding: "8px 12px",
            marginBottom: "1rem",
          }}
        >
          {refreshError}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 120px 90px 80px 60px",
              gap: "12px",
              padding: "0 14px 8px",
              borderBottom: "0.5px solid var(--border)",
            }}
          >
            {[
              "habit a",
              "habit b",
              "φ bar",
              "strength",
              "co-days",
              "overlap",
            ].map((h) => (
              <div
                key={h}
                style={{
                  fontSize: "10px",
                  color: "var(--text-faint)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div
              style={{
                padding: "2rem 0",
                textAlign: "center",
                color: "var(--text-faint)",
                fontSize: "12px",
              }}
            >
              no correlations match this filter.
            </div>
          )}

          {filtered.map((c, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 120px 90px 80px 60px",
                gap: "12px",
                padding: "10px 14px",
                background: "var(--bg-card)",
                border: "0.5px solid #1e1e1e",
                borderRadius: "6px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: c.habit_a.color || "#888",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.habit_a.name}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: c.habit_b.color || "#888",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.habit_b.name}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <PhiBar phi={c.phi} />
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: strengthColor(c.phi),
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {strengthLabel(c.phi)}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {c.co_occurrences}{" "}
                <span style={{ color: "var(--text-faint)" }}>days</span>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: c.overlap_pct >= 60 ? "#1D9E75" : "#555",
                }}
              >
                {c.overlap_pct}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Matrix view */}
      {view === "matrix" && (
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-faint)",
              marginBottom: "12px",
              letterSpacing: "0.06em",
            }}
          >
            teal = tend to happen together · coral = tend not to co-occur
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "inline-block", minWidth: "max-content" }}>
              {/* Column headers */}
              <div
                style={{
                  display: "flex",
                  gap: "3px",
                  paddingLeft: "100px",
                  marginBottom: "3px",
                }}
              >
                {habitIds.map((id) => (
                  <div
                    key={id}
                    style={{
                      width: "28px",
                      fontSize: "8px",
                      color: "var(--text-dim)",
                      textAlign: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: "DM Mono, monospace",
                      transform: "rotate(-45deg)",
                      transformOrigin: "left bottom",
                      height: "40px",
                      display: "flex",
                      alignItems: "flex-end",
                    }}
                  >
                    {habitMap[id]?.name?.slice(0, 10)}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {habitIds.map((rowId) => (
                <div
                  key={rowId}
                  style={{
                    display: "flex",
                    gap: "3px",
                    marginBottom: "3px",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "96px",
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      textAlign: "right",
                      paddingRight: "8px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {habitMap[rowId]?.name}
                  </div>
                  {habitIds.map((colId) => {
                    if (rowId === colId)
                      return <MatrixCell key={colId} phi={1} />;
                    return (
                      <MatrixCell
                        key={colId}
                        phi={phiMap[`${rowId}-${colId}`] ?? null}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "16px",
              flexWrap: "wrap",
            }}
          >
            {[
              {
                color: "rgba(29,158,117,0.9)",
                label: "strong positive (φ ≥ 0.6)",
              },
              {
                color: "rgba(29,158,117,0.4)",
                label: "mild positive (φ 0.2–0.6)",
              },
              { color: "rgba(153,60,29,0.4)", label: "mild negative" },
              { color: "rgba(153,60,29,0.9)", label: "strong negative" },
            ].map(({ color, label }) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    background: color,
                    borderRadius: "3px",
                  }}
                />
                <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CorrelationEngine;

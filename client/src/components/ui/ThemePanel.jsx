import { useState, useRef, useEffect } from "react";

const THEME_OPTIONS = [
  { value: "auto", label: "Auto", icon: "◐" },
  { value: "dark", label: "Dark", icon: "●" },
  { value: "light", label: "Light", icon: "○" },
  { value: "amoled", label: "AMOLED", icon: "⬛" },
  { value: "sepia", label: "Sepia", icon: "≋" },
  { value: "high-contrast", label: "Contrast", icon: "◈" },
];

const FILTER_OPTIONS = [
  { value: "none", label: "None" },
  { value: "grayscale(100%)", label: "Grayscale" },
  { value: "invert(100%)", label: "Inverted" },
  { value: "sepia(40%) brightness(85%)", label: "Night warm" },
  { value: "url(#protanopia)", label: "Protanopia" },
  { value: "url(#deuteranopia)", label: "Deuteranopia" },
  { value: "url(#tritanopia)", label: "Tritanopia" },
];

const UI_MODE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "focus", label: "Focus" },
  { value: "simplified", label: "Simplified" },
  { value: "immersive", label: "Immersive" },
];

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--accent)" : "var(--bg-card)",
        border: `0.5px solid ${active ? "var(--accent)" : "var(--border-mid)"}`,
        borderRadius: "4px",
        color: active ? "var(--bg)" : "var(--text-muted)",
        fontFamily: "DM Mono, monospace",
        fontSize: "11px",
        padding: "5px 10px",
        cursor: "pointer",
        letterSpacing: "0.04em",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div
        style={{
          fontSize: "10px",
          color: "var(--text-dim)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {children}
      </div>
    </div>
  );
}

export default function ThemePanel({
  theme, setTheme,
  filter, setFilter,
  uiMode, setUiMode,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        !btnRef.current?.contains(e.target) &&
        !panelRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Compute popover position anchored to button
  const [pos, setPos] = useState({ bottom: 0, left: 0 });
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      // open upward from button, with 8px gap
      bottom: window.innerHeight - rect.top + 8,
      left: rect.left,
    });
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "transparent",
          border: "0.5px solid var(--border-mid)",
          borderRadius: "6px",
          color: open ? "var(--accent)" : "var(--text-muted)",
          fontFamily: "DM Mono, monospace",
          fontSize: "14px",
          padding: "4px 10px",
          cursor: "pointer",
          letterSpacing: "0.04em",
          transition: "color 0.15s, border-color 0.15s",
        }}
      >
        ◐
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            bottom: pos.bottom,
            left: pos.left,
            background: "var(--bg-card)",
            border: "0.5px solid var(--border-mid)",
            borderRadius: "10px",
            padding: "16px",
            zIndex: 1000,
            minWidth: "300px",
            maxWidth: "calc(100vw - 32px)",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
          }}
        >
          <Section label="Theme">
            {THEME_OPTIONS.map((o) => (
              <Chip key={o.value} active={theme === o.value} onClick={() => setTheme(o.value)}>
                {o.icon} {o.label}
              </Chip>
            ))}
          </Section>
          <Section label="Vision filter">
            {FILTER_OPTIONS.map((o) => (
              <Chip key={o.value} active={filter === o.value} onClick={() => setFilter(o.value)}>
                {o.label}
              </Chip>
            ))}
          </Section>
          <Section label="UI Mode">
            {UI_MODE_OPTIONS.map((o) => (
              <Chip key={o.value} active={uiMode === o.value} onClick={() => setUiMode(o.value)}>
                {o.label}
              </Chip>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}
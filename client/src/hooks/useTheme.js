import { useState, useEffect } from "react";

export const THEMES = {
  dark: "dark",
  light: "light",
  amoled: "amoled",
  sepia: "sepia",
  highContrast: "high-contrast",
  auto: "auto",
};

export const FILTERS = {
  none: "none",
  grayscale: "grayscale(100%)",
  invert: "invert(100%)",
  night: "sepia(40%) brightness(85%)",
  protanopia: "url(#protanopia)",
  deuteranopia: "url(#deuteranopia)",
  tritanopia: "url(#tritanopia)",
};

export const UI_MODES = {
  normal: "normal",
  focus: "focus",
  simplified: "simplified",
  immersive: "immersive",
};

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark",
  );
  const [filter, setFilter] = useState(
    () => localStorage.getItem("filter") || "none",
  );
  const [uiMode, setUiMode] = useState(
    () => localStorage.getItem("uiMode") || "normal",
  );

  // Resolve "auto" based on system preference
  const resolvedTheme =
    theme === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    localStorage.setItem("theme", theme);
  }, [theme, resolvedTheme]);

  useEffect(() => {
    document.documentElement.style.filter = filter;
    localStorage.setItem("filter", filter);
  }, [filter]);

  useEffect(() => {
    document.documentElement.setAttribute("data-ui-mode", uiMode);
    localStorage.setItem("uiMode", uiMode);
  }, [uiMode]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () =>
      document.documentElement.setAttribute(
        "data-theme",
        mq.matches ? "dark" : "light",
      );
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return {
    theme,
    setTheme,
    filter,
    setFilter,
    uiMode,
    setUiMode,
    resolvedTheme,
  };
}

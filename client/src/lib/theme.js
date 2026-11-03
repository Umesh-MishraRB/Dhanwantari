import { useSyncExternalStore } from "react";

const KEY = "theme";
const listeners = new Set();

export const getTheme = () => (document.documentElement.classList.contains("light") ? "light" : "dark");

export function applyTheme(theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f0f3ff" : "#02021a");
}

export function setTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch { /* private mode: still switch for this session */ }
  applyTheme(theme);
  listeners.forEach((l) => l());
}

const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** const [theme, toggle] = useTheme() - shared by every component (navbar, landing...), persisted in localStorage. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark");
  return [theme, () => setTheme(theme === "dark" ? "light" : "dark")];
}

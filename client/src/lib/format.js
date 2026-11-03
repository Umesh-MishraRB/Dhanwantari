import { currentLocale } from "../i18n/index.jsx";

export function fmtDate(d) {
  if (!d) return "";
  const date = new Date(`${d}T00:00:00`);
  return date.toLocaleDateString(currentLocale(), { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
export function fmtDateShort(d) {
  if (!d) return "";
  return new Date(`${d}T00:00:00`).toLocaleDateString(currentLocale(), { weekday: "short", day: "numeric", month: "short" });
}
export function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`;
}
export const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString(currentLocale(), { dateStyle: "medium", timeStyle: "short" }) : "");
export const pct = (n) => `${Math.round((n || 0) * 100)}%`;
export const todayStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const prettyLabel = (s = "") => s.replace(/_/g, " ");
export const ageFrom = (dob) => {
  if (!dob) return null;
  const b = new Date(dob);
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

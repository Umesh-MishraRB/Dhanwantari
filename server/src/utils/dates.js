// Dates are stored as "YYYY-MM-DD" and times as "HH:mm" in the clinic's local time.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidDate = (s) => typeof s === "string" && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00`));
export const isValidTime = (s) => typeof s === "string" && TIME_RE.test(s);

export function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return todayStr(d);
}

export const isPastSlot = (date, time) => new Date(`${date}T${time}:00`).getTime() <= Date.now();
export const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

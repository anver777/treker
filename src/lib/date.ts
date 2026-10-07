import { dateLocale } from "@/i18n";

/* ============================================================
   Date helpers — everything is keyed by ISO "YYYY-MM-DD"
   ============================================================ */

export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function isISO(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function addDays(iso: string, days: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function diffDays(a: string, b: string): number {
  const ms = fromISO(a).getTime() - fromISO(b).getTime();
  return Math.round(ms / 86400000);
}

export function daysBetween(a: string, b: string): number[] {
  const total = Math.abs(diffDays(a, b));
  if (total > 400) return [];
  const out: number[] = [];
  for (let i = 0; i <= total; i++) out.push(i);
  return out;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function addMonths(iso: string, delta: number): string {
  const d = fromISO(iso);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return toISO(d);
}

export function monthLabel(iso: string): string {
  const d = fromISO(iso);
  const raw = d.toLocaleDateString(dateLocale(), { month: "long", year: "numeric" });
  return raw.replace(/\s*г\.?\s*$/, "");
}

export function dayLabel(iso: string): string {
  const d = fromISO(iso);
  return d.toLocaleDateString(dateLocale(), { weekday: "short", day: "numeric", month: "short" });
}

export function weekdayLabel(iso: string): string {
  return fromISO(iso).toLocaleDateString(dateLocale(), { weekday: "short" });
}

export interface DayCell {
  iso: string;
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** Calendar grid (Mon-first or Sun-first) with leading/trailing days. */
export function monthGrid(anchorISO: string, mondayFirst = true): DayCell[] {
  const anchor = fromISO(anchorISO);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const startOffset = mondayFirst
    ? (first.getDay() + 6) % 7
    : first.getDay();
  const cells: DayCell[] = [];
  const today = todayISO();

  for (let i = startOffset; i > 0; i--) {
    const d = new Date(first);
    d.setDate(d.getDate() - i);
    cells.push(makeCell(d, false, today));
  }
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(makeCell(new Date(anchor.getFullYear(), anchor.getMonth(), d), true, today));
  }
  const trailing = 7 - (cells.length % 7);
  for (let i = 1; i < trailing; i++) {
    const d = new Date(last);
    d.setDate(d.getDate() + i);
    cells.push(makeCell(d, false, today));
  }
  return cells;
}

function makeCell(d: Date, inMonth: boolean, today: string): DayCell {
  const iso = toISO(d);
  return {
    iso,
    date: d,
    inMonth,
    isToday: iso === today,
    isFuture: iso > today,
  };
}

export function lastNDays(n: number, endISO = todayISO()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endISO, -i));
  return out;
}

/** 2024-01-01 is a Monday — a stable week for locale-aware weekday names. */
export function weekdayLabels(mondayFirst = true): string[] {
  const base = [0, 1, 2, 3, 4, 5, 6].map((i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(dateLocale(), { weekday: "short" }),
  );
  if (mondayFirst) return base;
  return [base[6], ...base.slice(0, 6)];
}

export function timeAgo(isoDateTime: string): string {
  const then = new Date(isoDateTime).getTime();
  if (!Number.isFinite(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDateTime).toLocaleDateString(dateLocale(), { month: "short", day: "numeric" });
}

export function clockTime(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(dateLocale(), { hour: "2-digit", minute: "2-digit" });
}

/** Returns an i18n key so the greeting always follows the interface language. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "greet.night";
  if (h < 12) return "greet.morning";
  if (h < 18) return "greet.afternoon";
  if (h < 22) return "greet.evening";
  return "greet.night";
}

export function deadlineStatus(iso: string | null): { label: string; days: number; tone: "ok" | "soon" | "late" } {
  if (!iso) return { label: "No deadline", days: 0, tone: "ok" };
  const days = diffDays(iso, todayISO());
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, days, tone: "late" };
  if (days === 0) return { label: "Due today", days, tone: "soon" };
  if (days === 1) return { label: "Due tomorrow", days, tone: "soon" };
  return { label: `${days}d left`, days, tone: "ok" };
}

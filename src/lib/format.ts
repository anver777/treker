import { numLocale } from "@/i18n";

/* ============================================================
   Formatting helpers — never render NaN / Infinity / undefined
   ============================================================ */

export function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatNumber(value: unknown): string {
  const n = safeNumber(value, 0);
  return Math.round(n).toLocaleString(numLocale());
}

export function compactNumber(value: unknown): string {
  const n = safeNumber(value, 0);
  const abs = Math.abs(n);
  const ru = numLocale() === "ru-RU";
  if (abs >= 1_000_000_000) return `${trim(n / 1_000_000_000)}${ru ? " млрд" : "B"}`;
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)}${ru ? " млн" : "M"}`;
  if (abs >= 10_000) return `${trim(n / 1_000)}${ru ? " тыс" : "K"}`;
  return formatNumber(n);
}

function trim(n: number): string {
  const r = Math.round(n * 100) / 100;
  return `${r}`.replace(/\.0+$/, "");
}

export function formatCurrency(value: unknown, currency = "₽"): string {
  const n = safeNumber(value, 0);
  const sign = n < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(n))} ${currency}`;
}

export function compactCurrency(value: unknown, currency = "₽"): string {
  const n = safeNumber(value, 0);
  const sign = n < 0 ? "-" : "";
  return `${sign}${compactNumber(Math.abs(n))} ${currency}`;
}

export function formatPercent(value: unknown, digits = 1): string {
  const n = safeNumber(value, 0);
  return `${n.toFixed(digits)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function pluralize(n: number, one: string, many: string): string {
  const count = Math.abs(Math.round(safeNumber(n, 0)));
  return count === 1 ? one : many;
}

export function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

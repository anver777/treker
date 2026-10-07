import type { Habit } from "@/types";
import { addDays, diffDays, fromISO, todayISO } from "@/lib/date";

/* ============================================================
   Habit planning primitives
   ------------------------------------------------------------
   A day is "planned" for a habit when the habit was supposed to
   happen on that day. Only planned days count towards the
   completion rate, so future days, days before the start date,
   non-scheduled weekdays and paused days are never "missed".
   ============================================================ */

export function habitStartDate(habit: Habit): string {
  return habit.startDate || habit.createdAt.slice(0, 10);
}

export function isHabitPaused(habit: Habit, iso: string): boolean {
  if (!habit.pausedFrom || !habit.pausedUntil) return false;
  return iso >= habit.pausedFrom && iso <= habit.pausedUntil;
}

export function isHabitActiveOn(habit: Habit): boolean {
  return habit.status !== "archived";
}

/** Is the habit scheduled on this date (independent of completion)? */
export function isHabitPlanned(habit: Habit, iso: string, today = todayISO()): boolean {
  if (!isHabitActiveOn(habit)) return false;
  if (iso > today) return false;
  if (iso < habitStartDate(habit)) return false;
  if (isHabitPaused(habit, iso)) return false;

  const dow = fromISO(iso).getDay(); // 0 = Sunday
  switch (habit.frequency) {
    case "weekdays":
      return dow >= 1 && dow <= 5;
    case "weekends":
      return dow === 0 || dow === 6;
    case "custom":
      return Array.isArray(habit.customDays) && habit.customDays.includes(dow);
    case "daily":
    default:
      return true;
  }
}

export interface HabitWindowStats {
  done: number;
  planned: number;
  rate: number;
}

/** Completion rate between two ISO dates (inclusive), planned days only. */
export function habitWindowStats(
  habit: Habit,
  fromISODate: string,
  toISODate: string,
  today = todayISO(),
): HabitWindowStats {
  const set = new Set(habit.completions.filter(Boolean));
  const rawStart = fromISODate < habitStartDate(habit) ? habitStartDate(habit) : fromISODate;
  const end = toISODate > today ? today : toISODate;
  const total = diffDays(end, rawStart);

  let planned = 0;
  let done = 0;
  // Guard against absurd ranges (corrupted data) to keep the UI responsive
  const limit = Math.min(Math.max(total, 0), 800);
  for (let i = 0; i <= limit; i++) {
    const iso = addDays(rawStart, i);
    const scheduled = isHabitPlanned(habit, iso, today);
    const completed = set.has(iso);
    if (scheduled) planned += 1;
    // A completion on an unscheduled day still counts as done work.
    if (completed) done += 1;
  }
  const rate = planned > 0 ? Math.min(100, (done / planned) * 100) : 0;
  return { done, planned, rate };
}

/** All dates in a range where the habit was planned. */
export function plannedDates(habit: Habit, fromISODate: string, toISODate: string, today = todayISO()): string[] {
  const out: string[] = [];
  const rawStart = fromISODate < habitStartDate(habit) ? habitStartDate(habit) : fromISODate;
  const end = toISODate > today ? today : toISODate;
  const total = Math.min(Math.max(diffDays(end, rawStart), 0), 800);
  for (let i = 0; i <= total; i++) {
    const iso = addDays(rawStart, i);
    if (isHabitPlanned(habit, iso, today)) out.push(iso);
  }
  return out;
}

/** Habits that were supposed to be done on a specific date. */
export function habitsPlannedOn(habits: Habit[], iso: string, today = todayISO()): Habit[] {
  return habits.filter((h) => isHabitPlanned(h, iso, today));
}

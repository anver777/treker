import type { AppData, Habit, StatKey } from "@/types";
import {
  addDays,
  diffDays,
  fromISO,
  monthLabel as rawMonthLabel,
  todayISO,
  toISO,
} from "@/lib/date";
import { habitStreak, habitWindowStats, lifeScore, questStats } from "@/lib/selectors";
import { habitStartDate, isHabitPlanned, habitsPlannedOn } from "@/lib/habitPlan";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { STATS } from "@/lib/stats";
import { safeNumber } from "@/lib/format";

/* ============================================================
   Habit Matrix analytics — the whole page is derived from here
   ============================================================ */

export type CellState = "done" | "missed" | "future" | "rest" | "paused" | "empty";

export interface MatrixCell {
  iso: string;
  day: number;
  state: CellState;
  inMonth: boolean;
  isToday: boolean;
  planned: boolean;
}

export interface MatrixRow {
  habit: Habit;
  stats: {
    done: number;
    planned: number;
    rate: number;
    missed: number;
    currentStreak: number;
    bestStreak: number;
    totalCompletions: number;
    xpEarned: number;
  };
  cells: MatrixCell[];
}

export interface WeekSection {
  label: string;
  index: number;
  days: string[];
}

/** Monday-first weeks that intersect the given month. */
export function monthWeeks(anchorISO: string): WeekSection[] {
  const [y, m] = anchorISO.split("-").map((n) => parseInt(n, 10));
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const weeks: WeekSection[] = [];
  let cursor = new Date(first);
  cursor.setDate(cursor.getDate() - ((first.getDay() + 6) % 7));
  let index = 1;
  while (cursor <= last) {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(toISO(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i)));
    }
    weeks.push({ label: `W${index}`, index, days });
    cursor.setDate(cursor.getDate() + 7);
    index += 1;
  }
  return weeks;
}

export function monthBounds(anchorISO: string): { start: string; end: string } {
  const [y, m] = anchorISO.split("-").map((n) => parseInt(n, 10));
  return {
    start: toISO(new Date(y, m - 1, 1)),
    end: toISO(new Date(y, m, 0)),
  };
}

function cellState(habit: Habit, iso: string, today: string, inMonth: boolean): CellState {
  if (!inMonth) return "empty";
  if (iso > today) return "future";
  const set = habit.completions.includes(iso);
  if (set) return "done";
  const paused =
    habit.pausedFrom && habit.pausedUntil && iso >= habit.pausedFrom && iso <= habit.pausedUntil;
  if (paused) return "paused";
  if (!isHabitPlanned(habit, iso, today)) return "rest";
  return "missed";
}

/** Every habit row with per-day states for the month of `anchorISO`. */
export function buildMatrix(habits: Habit[], anchorISO: string, today = todayISO()): MatrixRow[] {
  const { start, end } = monthBounds(anchorISO);
  const days: string[] = [];
  for (let i = 0; i <= diffDays(end, start); i++) days.push(addDays(start, i));
  const set = new Set<string>();
  const weeks = monthWeeks(anchorISO);
  for (const w of weeks) for (const d of w.days) set.add(d);

  return habits.map((habit) => {
    const w = habitWindowStats(habit, start, end, today);
    const streak = habitStreak(habit, today);
    return {
      habit,
      stats: {
        done: w.done,
        planned: w.planned,
        rate: w.rate,
        missed: Math.max(0, w.planned - w.done),
        currentStreak: streak.current,
        bestStreak: streak.best,
        totalCompletions: habit.completions.length,
        xpEarned: safeNumber(habit.totalXpEarned),
      },
      cells: days.map((iso) => ({
        iso,
        day: fromISO(iso).getDate(),
        state: cellState(habit, iso, today, true),
        inMonth: true,
        isToday: iso === today,
        planned: isHabitPlanned(habit, iso, today),
      })),
    };
  });
}

/** Days of the month (for the header) with week-index lookups. */
export function monthDays(anchorISO: string): { iso: string; day: number; weekIndex: number }[] {
  const { start, end } = monthBounds(anchorISO);
  const out: { iso: string; day: number; weekIndex: number }[] = [];
  const total = diffDays(end, start);
  for (let i = 0; i <= total; i++) {
    const iso = addDays(start, i);
    const dow = (fromISO(iso).getDay() + 6) % 7;
    out.push({ iso, day: fromISO(iso).getDate(), weekIndex: Math.floor((i + dow) / 7) + 1 });
  }
  return out;
}

export interface MonthProgress {
  done: number;
  planned: number;
  rate: number;
}

export function monthProgress(habits: Habit[], anchorISO: string, today = todayISO()): MonthProgress {
  const { start, end } = monthBounds(anchorISO);
  let done = 0;
  let planned = 0;
  for (const h of habits) {
    const w = habitWindowStats(h, start, end, today);
    done += w.done;
    planned += w.planned;
  }
  return { done, planned, rate: planned > 0 ? (done / planned) * 100 : 0 };
}

export interface DayProgress {
  iso: string;
  day: number;
  done: number;
  planned: number;
  rate: number;
}

export function progressByDay(
  habits: Habit[],
  anchorISO: string,
  today = todayISO(),
): DayProgress[] {
  const { start, end } = monthBounds(anchorISO);
  const total = diffDays(end, start);
  const out: DayProgress[] = [];
  for (let i = 0; i <= total; i++) {
    const iso = addDays(start, i);
    const planned = habitsPlannedOn(habits, iso, today);
    const done = planned.filter((h) => h.completions.includes(iso)).length;
    out.push({
      iso,
      day: fromISO(iso).getDate(),
      done,
      planned: planned.length,
      rate: planned.length > 0 ? (done / planned.length) * 100 : 0,
    });
  }
  return out;
}

export interface WeekProgress {
  label: string;
  index: number;
  done: number;
  planned: number;
  rate: number;
  days: string[];
}

export function progressByWeek(
  habits: Habit[],
  anchorISO: string,
  today = todayISO(),
): WeekProgress[] {
  return monthWeeks(anchorISO).map((week, i) => {
    let done = 0;
    let planned = 0;
    for (const iso of week.days) {
      const list = habitsPlannedOn(habits, iso, today);
      planned += list.length;
      done += list.filter((h) => h.completions.includes(iso)).length;
    }
    return {
      label: week.label,
      index: i + 1,
      done,
      planned,
      rate: planned > 0 ? (done / planned) * 100 : 0,
      days: week.days,
    };
  });
}

export interface HabitRank {
  habit: Habit;
  rate: number;
  done: number;
  planned: number;
  missed: number;
  streak: number;
}

function rankHabits(habits: Habit[], anchorISO: string, today: string): HabitRank[] {
  const { start, end } = monthBounds(anchorISO);
  return habits
    .map((habit) => {
      const w = habitWindowStats(habit, start, end, today);
      return {
        habit,
        rate: w.rate,
        done: w.done,
        planned: w.planned,
        missed: Math.max(0, w.planned - w.done),
        streak: habitStreak(habit, today).current,
      };
    })
    .filter((r) => r.planned > 0);
}

export function topConsistent(
  habits: Habit[],
  anchorISO: string,
  limit = 10,
  today = todayISO(),
): HabitRank[] {
  return rankHabits(habits, anchorISO, today)
    .sort((a, b) => b.rate - a.rate || b.done - a.done)
    .slice(0, limit);
}

export function mostMissed(
  habits: Habit[],
  anchorISO: string,
  limit = 10,
  today = todayISO(),
): HabitRank[] {
  return rankHabits(habits, anchorISO, today)
    .sort((a, b) => a.rate - b.rate || b.missed - a.missed)
    .slice(0, limit);
}

/** Weekday (Mon..Sun) miss rate — used by the AI coach. */
export function missRateByWeekday(
  habits: Habit[],
  days = 90,
  today = todayISO(),
): { label: string; rate: number; missed: number; planned: number }[] {
  const labels = [0, 1, 2, 3, 4, 5, 6].map((i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(today.length === 10 ? "en-US" : "en-US", {
      weekday: "short",
    }),
  );
  const planned = new Array(7).fill(0);
  const missed = new Array(7).fill(0);
  for (let i = 0; i < days; i++) {
    const iso = addDays(today, -i);
    const list = habitsPlannedOn(habits, iso, today);
    const idx = (fromISO(iso).getDay() + 6) % 7;
    for (const h of list) {
      planned[idx] += 1;
      if (!h.completions.includes(iso)) missed[idx] += 1;
    }
  }
  return labels.map((label, i) => ({
    label,
    planned: planned[i],
    missed: missed[i],
    rate: planned[i] > 0 ? (missed[i] / planned[i]) * 100 : 0,
  }));
}

/* ---------- Summaries ---------- */

export interface MonthSummary {
  monthKey: string;
  label: string;
  xp: number;
  habitDone: number;
  habitPlanned: number;
  habitRate: number;
  bestStreak: number;
  questsDone: number;
  questsTotal: number;
  goalsActive: number;
  achievementsUnlocked: number;
  perfectDays: number;
  daysTracked: number;
  bestHabit: HabitRank | null;
  worstHabit: HabitRank | null;
}

export function monthSummary(data: AppData, anchorISO: string, today = todayISO()): MonthSummary {
  const key = anchorISO.slice(0, 7);
  const habits = data.habits.filter((h) => h.status !== "archived");
  const progress = monthProgress(habits, anchorISO, today);
  const ranked = rankHabits(habits, anchorISO, today).sort((a, b) => b.rate - a.rate);
  const xp = data.activity
    .filter((a) => a.createdAt.slice(0, 7) === key)
    .reduce((s, a) => s + safeNumber(a.xp, 0), 0);

  const { start, end } = monthBounds(anchorISO);
  const trackedEnd = end > today ? today : end;
  let perfectDays = 0;
  let daysTracked = 0;
  for (let i = 0; i <= diffDays(trackedEnd, start); i++) {
    const iso = addDays(start, i);
    const list = habitsPlannedOn(habits, iso, today);
    if (list.length === 0) continue;
    daysTracked += 1;
    const done = list.filter((h) => h.completions.includes(iso)).length;
    if (done === list.length) perfectDays += 1;
  }

  const bestStreak = habits.reduce((max, h) => Math.max(max, habitStreak(h, today).best), 0);
  const qs = questStats(data.quests, today);
  const monthQuests = data.quests.filter(
    (q) => (q.completedAt ? q.completedAt.slice(0, 7) === key : q.createdAt.slice(0, 7) <= key),
  );
  const achievementsUnlocked = Object.values(data.achievements).filter(
    (a) => a.unlockedAt && a.unlockedAt.slice(0, 7) === key,
  ).length;

  return {
    monthKey: key,
    label: rawMonthLabel(anchorISO),
    xp,
    habitDone: progress.done,
    habitPlanned: progress.planned,
    habitRate: progress.rate,
    bestStreak,
    questsDone: monthQuests.filter((q) => q.completedAt && q.completedAt.slice(0, 7) === key).length,
    questsTotal: monthQuests.length || qs.total,
    goalsActive: data.goals.filter((g) => !g.completedAt).length,
    achievementsUnlocked,
    perfectDays,
    daysTracked,
    bestHabit: ranked[0] ?? null,
    worstHabit: ranked.length > 0 ? ranked[ranked.length - 1] : null,
  };
}

export interface ComparisonMetric {
  key: string;
  current: number;
  previous: number;
  delta: number;
  deltaLabel: string;
  suffix: string;
  digits: number;
}

export interface MonthComparison {
  currentLabel: string;
  previousLabel: string;
  metrics: ComparisonMetric[];
  improved: number;
}

function prevMonthISO(anchorISO: string): string {
  const [y, m] = anchorISO.split("-").map((n) => parseInt(n, 10));
  const d = new Date(y, m - 2, 1);
  return toISO(d);
}

export function monthComparison(data: AppData, anchorISO: string, today = todayISO()): MonthComparison {
  const cur = monthSummary(data, anchorISO, today);
  const prev = monthSummary(data, prevMonthISO(anchorISO), today);
  const mk = (
    key: string,
    current: number,
    previous: number,
    suffix: string,
    digits = 1,
  ): ComparisonMetric => {
    const delta = current - previous;
    const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
    const abs = Math.abs(delta);
    const value = digits > 0 ? abs.toFixed(digits) : Math.round(abs).toLocaleString("en-US");
    return {
      key,
      current,
      previous,
      delta,
      deltaLabel: delta === 0 ? "0" : `${sign}${value}${suffix}`,
      suffix,
      digits,
    };
  };
  const metrics = [
    mk("habitRate", cur.habitRate, prev.habitRate, "%"),
    mk("xp", cur.xp, prev.xp, " XP", 0),
    mk("bestStreak", cur.bestStreak, prev.bestStreak, " d", 0),
    mk("questsDone", cur.questsDone, prev.questsDone, "", 0),
    mk("perfectDays", cur.perfectDays, prev.perfectDays, "", 0),
  ];
  return {
    currentLabel: cur.label,
    previousLabel: prev.label,
    metrics,
    improved: metrics.filter((m) => m.delta > 0).length,
  };
}

/* ---------- Streak dashboard ---------- */

export interface StreakDashboard {
  current: number;
  longest: number;
  bestHabit: { habit: Habit; streak: number } | null;
  average: number;
  activeStreaks: number;
  habitsWithStreak: number;
}

export function streakDashboard(habits: Habit[], today = todayISO()): StreakDashboard {
  const list = habits.filter((h) => h.status !== "archived");
  let current = 0;
  let longest = 0;
  let bestHabit: { habit: Habit; streak: number } | null = null;
  let sum = 0;
  let counted = 0;
  let activeStreaks = 0;
  for (const h of list) {
    const s = habitStreak(h, today);
    current = Math.max(current, s.current);
    if (s.best > longest) {
      longest = s.best;
      bestHabit = { habit: h, streak: s.best };
    }
    if (s.current > 0) activeStreaks += 1;
    if (s.best > 0) {
      sum += s.best;
      counted += 1;
    }
  }
  return {
    current,
    longest,
    bestHabit,
    average: counted > 0 ? Math.round((sum / counted) * 10) / 10 : 0,
    activeStreaks,
    habitsWithStreak: counted,
  };
}

/* ---------- Activity heatmap ---------- */

export interface HeatCell {
  iso: string;
  xp: number;
  done: number;
  planned: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export function activityHeatmap(
  data: AppData,
  weeks = 18,
  today = todayISO(),
): { columns: HeatCell[][]; max: number } {
  const end = fromISO(today);
  const start = new Date(end);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const xpByDay = new Map<string, number>();
  for (const a of data.activity) {
    const iso = a.createdAt.slice(0, 10);
    xpByDay.set(iso, (xpByDay.get(iso) || 0) + safeNumber(a.xp, 0));
  }
  const habits = data.habits.filter((h) => h.status !== "archived");
  const columns: HeatCell[][] = [];
  let cursor = new Date(start);
  let max = 0;
  while (cursor <= end) {
    const col: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const iso = toISO(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i));
      const xp = xpByDay.get(iso) || 0;
      const planned = habitsPlannedOn(habits, iso, today);
      const done = planned.filter((h) => h.completions.includes(iso)).length;
      max = Math.max(max, xp);
      col.push({ iso, xp, done, planned: planned.length, level: 0 });
    }
    columns.push(col);
    cursor.setDate(cursor.getDate() + 7);
  }
  for (const col of columns) {
    for (const cell of col) {
      cell.level = cell.xp <= 0 ? 0 : cell.xp < 50 ? 1 : cell.xp < 100 ? 2 : cell.xp < 200 ? 3 : 4;
    }
  }
  return { columns, max };
}

/* ---------- Habit → stat mapping ---------- */

export function habitStatKeys(habit: Habit): StatKey[] {
  const list = Array.isArray(habit.stats) && habit.stats.length > 0 ? habit.stats : [habit.stat];
  return list.filter(Boolean);
}

export function habitStatLabels(habit: Habit): string[] {
  return habitStatKeys(habit).map((k) => STATS[k]?.short ?? k);
}

/** XP spread across the linked stats for a completed habit. */
export function habitStatXpSplit(habit: Habit, xp: number): Partial<Record<StatKey, number>> {
  const keys = habitStatKeys(habit);
  const out: Partial<Record<StatKey, number>> = {};
  if (keys.length === 0) return out;
  const per = Math.max(1, Math.round(xp / 4 / keys.length));
  for (const k of keys) out[k] = per;
  return out;
}

/* ---------- Habit ↔ goals / quests ---------- */

export function habitsForGoal(habits: Habit[], goalId: string | null): Habit[] {
  if (!goalId) return [];
  return habits.filter((h) => h.goalId === goalId);
}

export function goalHabitContribution(habits: Habit[], goalId: string | null, today = todayISO()) {
  const linked = habitsForGoal(habits, goalId);
  if (linked.length === 0) return { done: 0, planned: 0, rate: 0, habits: linked };
  const start = linked.reduce(
    (min, h) => (habitStartDate(h) < min ? habitStartDate(h) : min),
    habitStartDate(linked[0]),
  );
  let done = 0;
  let planned = 0;
  for (const h of linked) {
    const w = habitWindowStats(h, start, today, today);
    done += w.done;
    planned += w.planned;
  }
  return { done, planned, rate: planned > 0 ? (done / planned) * 100 : 0, habits: linked };
}

export function questsLinkedToHabit(quests: AppData["quests"], habitId: string) {
  return quests.filter((q) => q.linkedHabitId === habitId);
}

/* ---------- Life score detail (used by matrix page) ---------- */

export function lifeScoreBreakdown(data: AppData, today = todayISO()) {
  const ls = lifeScore(data, today);
  return ls;
}

export function totalAchievementCount(): number {
  return ACHIEVEMENTS.length;
}

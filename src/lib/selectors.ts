import { dateLocale, tr } from "@/i18n";
import type { AppData, Habit, Quest, StatKey } from "@/types";
import { STATS, STAT_KEYS } from "@/lib/stats";
import { levelInfo, statProgress } from "@/lib/xp";
import { addDays, diffDays, fromISO, lastNDays, todayISO, toISO } from "@/lib/date";
import { safeNumber } from "@/lib/format";
import { habitWindowStats, habitsPlannedOn, type HabitWindowStats } from "@/lib/habitPlan";

/* ============================================================
   Derived metrics — every number shown in the UI comes from here
   ============================================================ */

export interface StreakInfo {
  current: number;
  best: number;
}

export function habitStreak(habit: Habit, today = todayISO()): StreakInfo {
  const set = new Set(habit.completions.filter(Boolean));
  if (set.size === 0) return { current: 0, best: habit.bestStreak || 0 };

  let best = Math.max(1, habit.bestStreak || 0);
  let run = 1;
  const sorted = [...set].sort();
  for (let i = 1; i < sorted.length; i++) {
    if (diffDays(sorted[i], sorted[i - 1]) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
  }
  if (run > best) best = run;

  // current streak counts back from today (or yesterday if today is not done yet)
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor) && current < 1000) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, best: Math.max(best, current) };
}

export { habitWindowStats, isHabitPlanned, habitsPlannedOn } from "@/lib/habitPlan";

/** Completion rate between two ISO dates (inclusive) — planned days only. */
export function habitRateInWindow(
  habit: Habit,
  fromISODate: string,
  toISODate: string,
): HabitWindowStats {
  return habitWindowStats(habit, fromISODate, toISODate);
}

export interface HabitFullStats extends HabitWindowStats {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  last30: HabitWindowStats;
  missedLast30: number;
}

export function habitFullStats(habit: Habit, today = todayISO()): HabitFullStats {
  const all = habitRateInWindow(habit, habit.createdAt.slice(0, 10), today);
  const last30 = habitRateInWindow(habit, addDays(today, -29), today);
  const streak = habitStreak(habit, today);
  return {
    ...all,
    last30,
    missedLast30: Math.max(0, last30.planned - last30.done),
    currentStreak: streak.current,
    bestStreak: streak.best,
    totalCompletions: habit.completions.length,
  };
}

export function consistencyLabel(rate: number): { label: string; tone: "high" | "mid" | "low" } {
  if (rate >= 80) return { label: tr("consistency.high"), tone: "high" };
  if (rate >= 55) return { label: tr("consistency.mid"), tone: "mid" };
  return { label: tr("consistency.low"), tone: "low" };
}

export interface HabitsOverview {
  habitCount: number;
  totalCompletions: number;
  planned: number;
  rate: number;
  currentStreak: number;
  bestStreak: number;
  consistency: { label: string; tone: "high" | "mid" | "low" };
  todayDone: number;
  todayTotal: number;
}

export function habitsOverview(habits: Habit[], today = todayISO()): HabitsOverview {
  const active = habits.filter((h) => h.status !== "archived");
  let totalCompletions = 0;
  let planned = 0;
  let done = 0;
  let bestStreak = 0;
  let currentStreak = 0;
  const plannedTodayList = habitsPlannedOn(active, today, today);
  const todayTotal = plannedTodayList.length;
  const todayDone = plannedTodayList.filter((h) => h.completions.includes(today)).length;

  for (const h of active) {
    const s = habitFullStats(h, today);
    totalCompletions += s.totalCompletions;
    planned += s.planned;
    done += s.done;
    bestStreak = Math.max(bestStreak, s.bestStreak);
    currentStreak = Math.max(currentStreak, s.currentStreak);
  }
  const rate = planned > 0 ? (done / planned) * 100 : 0;
  return {
    habitCount: active.length,
    totalCompletions,
    planned,
    rate,
    currentStreak,
    bestStreak,
    consistency: consistencyLabel(rate),
    todayDone,
    todayTotal,
  };
}

export function topHabits(habits: Habit[], limit = 10, today = todayISO()) {
  return habits
    .filter((h) => h.status !== "archived")
    .map((h) => ({
      habit: h,
      rate: habitRateInWindow(h, addDays(today, -29), today).rate,
      streak: habitStreak(h, today).current,
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, limit);
}

/* ---------- Quests & goals ---------- */

export interface QuestStats {
  total: number;
  completed: number;
  active: number;
  overdue: number;
  rate: number;
  todayDone: number;
}

export function questStats(quests: Quest[], today = todayISO()): QuestStats {
  const completed = quests.filter((q) => q.completed).length;
  const overdue = quests.filter(
    (q) => !q.completed && q.deadline && q.deadline < today,
  ).length;
  const todayDone = quests.filter((q) => q.completedAt?.slice(0, 10) === today).length;
  return {
    total: quests.length,
    completed,
    active: quests.length - completed,
    overdue,
    rate: quests.length > 0 ? (completed / quests.length) * 100 : 0,
    todayDone,
  };
}

export function goalStats(goals: { progress: number; completedAt: string | null }[]) {
  const total = goals.length;
  const completed = goals.filter((g) => g.completedAt).length;
  const avg = total > 0 ? goals.reduce((sum, g) => sum + safeNumber(g.progress, 0), 0) / total : 0;
  return { total, completed, avgProgress: avg };
}

/* ---------- Daily summary ---------- */

export interface DaySummary {
  iso: string;
  xp: number;
  quests: { done: number; total: number };
  habits: { done: number; total: number };
  moneyIn: number;
  moneyOut: number;
  mood: number | null;
  score: number;
  achievements: number;
  events: number;
}

export function questsDueOn(quests: Quest[], iso: string): Quest[] {
  return quests.filter((q) => {
    const created = q.createdAt.slice(0, 10);
    if (created > iso) return false;
    if (q.completedAt) {
      const done = q.completedAt.slice(0, 10);
      return done === iso || done > iso ? done === iso : true;
    }
    return q.category === "daily" || q.category === "weekly" || q.category === "monthly";
  });
}

export function daySummary(data: AppData, iso: string, today = todayISO()): DaySummary {
  const dayActivity = data.activity.filter((a) => a.createdAt.slice(0, 10) === iso);
  const xp = dayActivity.reduce((s, a) => s + safeNumber(a.xp, 0), 0);

  const due = questsDueOn(data.quests, iso);
  const questsDone = due.filter((q) => q.completedAt?.slice(0, 10) === iso).length;

  const activeHabits = habitsPlannedOn(data.habits, iso, today);
  const habitsDone = activeHabits.filter((h) => h.completions.includes(iso)).length;

  const tx = data.transactions.filter((t) => t.date === iso);
  const moneyIn = tx.filter((t) => t.type === "income").reduce((s, t) => s + safeNumber(t.amount), 0);
  const moneyOut = tx.filter((t) => t.type === "expense").reduce((s, t) => s + safeNumber(t.amount), 0);

  const journal = data.journal[iso];
  const mood = journal ? safeNumber(journal.mood, 0) : null;
  const achievements = dayActivity.filter((a) => a.kind === "achievement").length;

  const parts: { rate: number; weight: number }[] = [];
  if (due.length > 0) parts.push({ rate: questsDone / due.length, weight: 40 });
  if (activeHabits.length > 0) parts.push({ rate: habitsDone / activeHabits.length, weight: 40 });
  if (mood !== null && mood > 0) parts.push({ rate: mood / 10, weight: 20 });
  if (parts.length === 0) {
    parts.push({ rate: Math.min(1, xp / 150), weight: 100 });
  }
  const weightSum = parts.reduce((s, p) => s + p.weight, 0);
  const score =
    weightSum > 0 ? parts.reduce((s, p) => s + p.rate * p.weight, 0) / weightSum : 0;

  return {
    iso,
    xp,
    quests: { done: questsDone, total: due.length },
    habits: { done: habitsDone, total: activeHabits.length },
    moneyIn,
    moneyOut,
    mood,
    score: Math.round(score * 100),
    achievements,
    events: dayActivity.length,
  };
}

/* ---------- Life Score ---------- */

export interface LifeScorePart {
  key: string;
  label: string;
  value: number;
  weight: number;
}

export interface LifeScore {
  score: number;
  parts: LifeScorePart[];
}

const LIFE_STAT_WEIGHT: Partial<Record<StatKey, number>> = {
  discipline: 8,
  health: 8,
  career: 8,
  finance: 8,
  knowledge: 8,
};

/** Character stat level considered "fully developed" for Life Score purposes. */
const STAT_LEVEL_CEILING = 70;
const STREAK_BONUS_TARGET = 14;

export function lifeScore(data: AppData, today = todayISO()): LifeScore {
  const parts: LifeScorePart[] = [];
  const levelOf = (key: StatKey) => {
    const s = data.stats[key];
    return safeNumber(s?.level, 1);
  };
  for (const key of Object.keys(LIFE_STAT_WEIGHT) as StatKey[]) {
    parts.push({
      key,
      label: STATS[key].label,
      value: Math.min(1, levelOf(key) / STAT_LEVEL_CEILING),
      weight: LIFE_STAT_WEIGHT[key] as number,
    });
  }
  const habits = habitsOverview(data.habits, today);
  parts.push({ key: "habits", label: tr("ls.habits"), value: Math.min(1, habits.rate / 100), weight: 25 });
  const goals = goalStats(data.goals);
  parts.push({
    key: "goals",
    label: tr("ls.goals"),
    value: Math.min(1, goals.avgProgress / 100),
    weight: 15,
  });
  const q = questStats(data.quests, today);
  parts.push({ key: "quests", label: tr("ls.quests"), value: Math.min(1, q.rate / 100), weight: 12 });
  parts.push({
    key: "streak",
    label: tr("ls.streak"),
    value: Math.min(1, habits.currentStreak / STREAK_BONUS_TARGET),
    weight: 8,
  });

  const weightSum = parts.reduce((s, p) => s + p.weight, 0) || 1;
  const score = parts.reduce((s, p) => s + p.value * p.weight, 0) / weightSum;
  return { score: Math.round(score * 100), parts };
}

/* ---------- XP series ---------- */

export interface SeriesPoint {
  label: string;
  value: number;
  meta?: string;
}

export function xpByDay(activity: AppData["activity"], days: number, today = todayISO()): SeriesPoint[] {
  const range = lastNDays(days, today);
  const map = new Map<string, number>();
  for (const a of activity) {
    const iso = a.createdAt.slice(0, 10);
    map.set(iso, (map.get(iso) || 0) + safeNumber(a.xp, 0));
  }
  return range.map((iso) => ({
    label: fromISO(iso).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" }),
    value: Math.round(map.get(iso) || 0),
    meta: iso,
  }));
}

export function cumulativeXpByDay(
  activity: AppData["activity"],
  days: number,
  totalXp: number,
  today = todayISO(),
): SeriesPoint[] {
  const daily = xpByDay(activity, days, today);
  const sum = daily.reduce((s, p) => s + p.value, 0);
  let running = Math.max(0, totalXp - sum);
  return daily.map((p) => {
    running += p.value;
    return { ...p, value: running };
  });
}

export function habitCompletionsByDay(habits: Habit[], days: number, today = todayISO()): SeriesPoint[] {
  const range = lastNDays(days, today);
  const counts = new Map<string, number>();
  for (const h of habits) {
    for (const iso of h.completions) counts.set(iso, (counts.get(iso) || 0) + 1);
  }
  return range.map((iso) => ({
    label: fromISO(iso).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" }),
    value: counts.get(iso) || 0,
    meta: iso,
  }));
}

export function dayScores(data: AppData, days: number, today = todayISO()): SeriesPoint[] {
  return lastNDays(days, today).map((iso) => ({
    label: fromISO(iso).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" }),
    value: daySummary(data, iso).score,
    meta: iso,
  }));
}

export function weekdayActivity(data: AppData): SeriesPoint[] {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const totals = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (const h of data.habits) {
    for (const iso of h.completions) {
      const idx = (fromISO(iso).getDay() + 6) % 7;
      totals[idx] += 1;
    }
  }
  for (const q of data.quests) {
    if (!q.completedAt) continue;
    const idx = (fromISO(q.completedAt.slice(0, 10)).getDay() + 6) % 7;
    totals[idx] += 1;
  }
  const activeHabits = data.habits.filter((h) => !h.archived).length || 1;
  for (let i = 0; i < 7; i++) counts[i] = activeHabits;
  return labels.map((label, i) => ({
    label,
    value: Math.round(totals[i] / Math.max(1, Math.min(counts[i], 8)) * 10) / 10,
  }));
}

/* ---------- Finance ---------- */

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
  byCategory: { key: string; value: number; share: number }[];
  count: number;
}

export function financeSummary(
  transactions: AppData["transactions"],
  month?: string,
): FinanceSummary {
  const list = month ? transactions.filter((t) => t.date.startsWith(month)) : transactions;
  const income = list.filter((t) => t.type === "income").reduce((s, t) => s + safeNumber(t.amount), 0);
  const expense = list.filter((t) => t.type === "expense").reduce((s, t) => s + safeNumber(t.amount), 0);
  const catMap = new Map<string, number>();
  for (const t of list) {
    if (t.type !== "expense") continue;
    catMap.set(t.category, (catMap.get(t.category) || 0) + safeNumber(t.amount));
  }
  const byCategory = [...catMap.entries()]
    .map(([key, value]) => ({
      key,
      value,
      share: expense > 0 ? (value / expense) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
  return {
    income,
    expense,
    balance: income - expense,
    savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0,
    byCategory,
    count: list.length,
  };
}

export function totalBalance(transactions: AppData["transactions"]): number {
  return transactions.reduce(
    (s, t) => s + (t.type === "income" ? 1 : -1) * safeNumber(t.amount),
    0,
  );
}

export function financeByMonth(
  transactions: AppData["transactions"],
  months: number,
  today = todayISO(),
): { label: string; income: number; expense: number }[] {
  const out: { label: string; income: number; expense: number }[] = [];
  const base = fromISO(today);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const key = toISO(d).slice(0, 7);
    const s = financeSummary(transactions, key);
    out.push({
      label: d.toLocaleDateString(dateLocale(), { month: "short" }),
      income: s.income,
      expense: s.expense,
    });
  }
  return out;
}

/* ---------- Aggregated context used by achievements + AI ---------- */

export interface MetricsContext {
  level: number;
  totalXp: number;
  questsCompleted: number;
  habitsCompleted: number;
  bestStreak: number;
  currentStreak: number;
  totalIncome: number;
  balance: number;
  goalsCompleted: number;
  dailyScoreToday: number;
  perfectDays: number;
  activeDays: number;
  statLevels: Record<StatKey, number>;
  weakestStat: StatKey;
  strongestStat: StatKey;
  topHabits: { habit: Habit; rate: number; streak: number }[];
  worstHabits: { habit: Habit; rate: number; streak: number }[];
}

export function metricsContext(data: AppData, today = todayISO()): MetricsContext {
  const lvl = levelInfo(data.profile.totalXp).level;
  const habits = habitsOverview(data.habits, today);
  const ranked = topHabits(data.habits, 99, today);
  const statLevels = {} as Record<StatKey, number>;
  for (const key of STAT_KEYS) statLevels[key] = safeNumber(data.stats[key]?.level, 1);
  const sortedStats = [...STAT_KEYS].sort((a, b) => statLevels[a] - statLevels[b]);
  const income = data.transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + safeNumber(t.amount), 0);
  const last30 = lastNDays(30, today);
  let perfectDays = 0;
  let activeDays = 0;
  for (const iso of last30) {
    const s = daySummary(data, iso);
    if (s.score >= 100) perfectDays += 1;
    if (s.events > 0) activeDays += 1;
  }
  return {
    level: lvl,
    totalXp: data.profile.totalXp,
    questsCompleted: data.quests.filter((q) => q.completed).length,
    habitsCompleted: habits.totalCompletions,
    bestStreak: habits.bestStreak,
    currentStreak: habits.currentStreak,
    totalIncome: income,
    balance: totalBalance(data.transactions),
    goalsCompleted: data.goals.filter((g) => g.completedAt).length,
    dailyScoreToday: daySummary(data, today).score,
    perfectDays,
    activeDays,
    statLevels,
    weakestStat: sortedStats[0],
    strongestStat: sortedStats[STAT_KEYS.length - 1],
    topHabits: ranked.slice(0, 3),
    worstHabits: [...ranked].reverse().slice(0, 3),
  };
}

export function statViews(data: AppData) {
  return STAT_KEYS.map((key) => {
    const raw = data.stats[key] || { level: 1, xp: 0 };
    const p = statProgress(raw.level, raw.xp);
    return {
      key,
      meta: STATS[key],
      level: p.level,
      xpIntoLevel: p.xpIntoLevel,
      xpForNext: p.xpForNext,
      progress: p.progress,
    };
  });
}

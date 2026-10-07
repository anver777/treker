import type { AppData, StatKey } from "@/types";
import type { MetricsContext } from "@/lib/selectors";
import { STATS } from "@/lib/stats";
import { addDays, todayISO } from "@/lib/date";
import { habitStreak } from "@/lib/selectors";
import { habitsPlannedOn } from "@/lib/habitPlan";
import { tr } from "@/i18n";

/* ============================================================
   Achievements — declarative definitions + evaluation engine
   ============================================================ */

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  group: string;
  check: (data: AppData, m: MetricsContext) => boolean;
  progress?: (data: AppData, m: MetricsContext) => { current: number; target: number };
}

export const BASE_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_step",
    get title() { return tr("ach.first_step.title"); },
    get description() { return tr("ach.first_step.desc"); },
    icon: "flag",
    xp: 50,
    rarity: "common",
    get group() { return tr("agroup.start"); },
    check: (_d, m) => m.questsCompleted >= 1,
    progress: (_d, m) => ({ current: Math.min(1, m.questsCompleted), target: 1 }),
  },
  {
    id: "habit_starter",
    get title() { return tr("ach.habit_starter.title"); },
    get description() { return tr("ach.habit_starter.desc"); },
    icon: "check",
    xp: 40,
    rarity: "common",
    get group() { return tr("agroup.start"); },
    check: (_d, m) => m.habitsCompleted >= 1,
    progress: (_d, m) => ({ current: Math.min(1, m.habitsCompleted), target: 1 }),
  },
  {
    id: "streak_7",
    get title() { return tr("ach.streak_7.title"); },
    get description() { return tr("ach.streak_7.desc"); },
    icon: "flame",
    xp: 100,
    rarity: "rare",
    get group() { return tr("agroup.consistency"); },
    check: (_d, m) => m.bestStreak >= 7,
    progress: (_d, m) => ({ current: Math.min(7, m.bestStreak), target: 7 }),
  },
  {
    id: "streak_30",
    get title() { return tr("ach.streak_30.title"); },
    get description() { return tr("ach.streak_30.desc"); },
    icon: "swords",
    xp: 300,
    rarity: "epic",
    get group() { return tr("agroup.consistency"); },
    check: (_d, m) => m.bestStreak >= 30,
    progress: (_d, m) => ({ current: Math.min(30, m.bestStreak), target: 30 }),
  },
  {
    id: "level_5",
    get title() { return tr("ach.level_5.title"); },
    get description() { return tr("ach.level_5.desc"); },
    icon: "star",
    xp: 80,
    rarity: "common",
    get group() { return tr("agroup.progress"); },
    check: (_d, m) => m.level >= 5,
    progress: (_d, m) => ({ current: Math.min(5, m.level), target: 5 }),
  },
  {
    id: "level_10",
    get title() { return tr("ach.level_10.title"); },
    get description() { return tr("ach.level_10.desc"); },
    icon: "trophy",
    xp: 200,
    rarity: "rare",
    get group() { return tr("agroup.progress"); },
    check: (_d, m) => m.level >= 10,
    progress: (_d, m) => ({ current: Math.min(10, m.level), target: 10 }),
  },
  {
    id: "level_25",
    get title() { return tr("ach.level_25.title"); },
    get description() { return tr("ach.level_25.desc"); },
    icon: "crown",
    xp: 500,
    rarity: "legendary",
    get group() { return tr("agroup.progress"); },
    check: (_d, m) => m.level >= 25,
    progress: (_d, m) => ({ current: Math.min(25, m.level), target: 25 }),
  },
  {
    id: "xp_10k",
    get title() { return tr("ach.xp_10k.title"); },
    get description() { return tr("ach.xp_10k.desc"); },
    icon: "zap",
    xp: 250,
    rarity: "epic",
    get group() { return tr("agroup.progress"); },
    check: (_d, m) => m.totalXp >= 10000,
    progress: (_d, m) => ({ current: Math.min(10000, m.totalXp), target: 10000 }),
  },
  {
    id: "money_maker",
    get title() { return tr("ach.money_maker.title"); },
    get description() { return tr("ach.money_maker.desc"); },
    icon: "coins",
    xp: 300,
    rarity: "epic",
    get group() { return tr("agroup.finance"); },
    check: (_d, m) => m.totalIncome >= 100000,
    progress: (_d, m) => ({ current: Math.min(100000, m.totalIncome), target: 100000 }),
  },
  {
    id: "saver",
    get title() { return tr("ach.saver.title"); },
    get description() { return tr("ach.saver.desc"); },
    icon: "piggy",
    xp: 200,
    rarity: "rare",
    get group() { return tr("agroup.finance"); },
    check: (_d, m) => m.balance >= 50000,
    progress: (_d, m) => ({ current: Math.min(50000, Math.max(0, m.balance)), target: 50000 }),
  },
  {
    id: "early_riser",
    get title() { return tr("ach.early_riser.title"); },
    get description() { return tr("ach.early_riser.desc"); },
    icon: "sunrise",
    xp: 120,
    rarity: "rare",
    get group() { return tr("agroup.consistency"); },
    check: (d) =>
      d.habits.some(
        (h) => /wake|morning|early|rise/i.test(h.name) && h.completions.length >= 7,
      ),
    progress: (d) => {
      const morning = d.habits.filter((h) => /wake|morning|early|rise/i.test(h.name));
      const best = morning.reduce((s, h) => Math.max(s, h.completions.length), 0);
      return { current: Math.min(7, best), target: 7 };
    },
  },
  {
    id: "disciplined",
    get title() { return tr("ach.disciplined.title"); },
    get description() { return tr("ach.disciplined.desc"); },
    icon: "shield",
    xp: 250,
    rarity: "epic",
    get group() { return tr("agroup.consistency"); },
    check: (_d, m) => m.habitsCompleted >= 100,
    progress: (_d, m) => ({ current: Math.min(100, m.habitsCompleted), target: 100 }),
  },
  {
    id: "project_builder",
    get title() { return tr("ach.project_builder.title"); },
    get description() { return tr("ach.project_builder.desc"); },
    icon: "hammer",
    xp: 200,
    rarity: "rare",
    get group() { return tr("agroup.career"); },
    check: (d) =>
      d.quests.some((q) => q.completed && /project|build|ship|launch/i.test(q.title)) ||
      d.goals.some(
        (g) => g.completedAt && /project|business|startup/i.test(`${g.title} ${g.description}`),
      ),
  },
  {
    id: "quest_master",
    get title() { return tr("ach.quest_master.title"); },
    get description() { return tr("ach.quest_master.desc"); },
    icon: "scroll",
    xp: 300,
    rarity: "epic",
    get group() { return tr("agroup.career"); },
    check: (_d, m) => m.questsCompleted >= 25,
    progress: (_d, m) => ({ current: Math.min(25, m.questsCompleted), target: 25 }),
  },
  {
    id: "goal_getter",
    get title() { return tr("ach.goal_getter.title"); },
    get description() { return tr("ach.goal_getter.desc"); },
    icon: "target",
    xp: 250,
    rarity: "rare",
    get group() { return tr("agroup.career"); },
    check: (_d, m) => m.goalsCompleted >= 1,
    progress: (_d, m) => ({ current: Math.min(1, m.goalsCompleted), target: 1 }),
  },
  {
    id: "perfect_day",
    get title() { return tr("ach.perfect_day.title"); },
    get description() { return tr("ach.perfect_day.desc"); },
    icon: "sparkles",
    xp: 150,
    rarity: "rare",
    get group() { return tr("agroup.consistency"); },
    check: (_d, m) => m.perfectDays >= 1,
    progress: (_d, m) => ({ current: Math.min(1, m.perfectDays), target: 1 }),
  },
  {
    id: "scholar",
    get title() { return tr("ach.scholar.title"); },
    get description() { return tr("ach.scholar.desc", { stat: STATS.knowledge.label }); },
    icon: "book",
    xp: 150,
    rarity: "rare",
    get group() { return tr("agroup.character"); },
    check: (d) => (d.stats.knowledge?.level || 1) >= 10,
    progress: (d) => ({ current: Math.min(10, d.stats.knowledge?.level || 1), target: 10 }),
  },
  {
    id: "iron_body",
    get title() { return tr("ach.iron_body.title"); },
    get description() { return tr("ach.iron_body.desc", { stat: STATS.strength.label }); },
    icon: "dumbbell",
    xp: 150,
    rarity: "rare",
    get group() { return tr("agroup.character"); },
    check: (d) => (d.stats.strength?.level || 1) >= 10,
    progress: (d) => ({ current: Math.min(10, d.stats.strength?.level || 1), target: 10 }),
  },
  {
    id: "balanced",
    get title() { return tr("ach.balanced.title"); },
    get description() { return tr("ach.balanced.desc"); },
    icon: "scale",
    xp: 400,
    rarity: "legendary",
    get group() { return tr("agroup.character"); },
    check: (_d, m) => Object.values(m.statLevels).every((l) => l >= 5),
    progress: (_d, m) => ({
      current: Object.values(m.statLevels).filter((l) => l >= 5).length,
      target: Object.keys(m.statLevels).length,
    }),
  },
];


/* ---------- Habit Matrix achievements ---------- */

interface PeriodScore {
  rate: number;
  perfectDays: number;
  trackedDays: number;
}

/** Habit completion over the last N days (planned days only). */
function windowScore(days: number): (data: AppData) => PeriodScore {
  return (data: AppData) => {
    const habits = data.habits.filter((h) => h.status !== "archived");
    let done = 0;
    let planned = 0;
    let perfectDays = 0;
    let trackedDays = 0;
    for (let i = 0; i < days; i++) {
      const iso = addDays(todayISO(), -i);
      const list = habitsPlannedOn(habits, iso, todayISO());
      if (list.length === 0) continue;
      trackedDays += 1;
      const doneToday = list.filter((h) => h.completions.includes(iso)).length;
      if (doneToday === list.length) perfectDays += 1;
      planned += list.length;
      done += doneToday;
    }
    return { rate: planned > 0 ? (done / planned) * 100 : 0, perfectDays, trackedDays };
  };
}

function bestHabitStreak(data: AppData): number {
  return data.habits.reduce((max, h) => Math.max(max, habitStreak(h, todayISO()).best), 0);
}

function currentHabitStreak(data: AppData): number {
  return data.habits.reduce((max, h) => Math.max(max, habitStreak(h, todayISO()).current), 0);
}

function monthHabitRate(data: AppData): number {
  const key = todayISO().slice(0, 7);
  const habits = data.habits.filter((h) => h.status !== "archived");
  const start = `${key}-01`;
  let done = 0;
  let planned = 0;
  const end = todayISO();
  for (let i = 0; i < 62; i++) {
    const iso = addDays(start, i);
    if (iso > end) break;
    const list = habitsPlannedOn(habits, iso, end);
    planned += list.length;
    done += list.filter((h) => h.completions.includes(iso)).length;
  }
  return planned > 0 ? (done / planned) * 100 : 0;
}

export const HABIT_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "streak_3",
    title: "3 Day Spark",
    description: "Keep a habit alive for 3 days in a row.",
    icon: "flame",
    xp: 40,
    rarity: "common",
    group: "Consistency",
    check: (d) => bestHabitStreak(d) >= 3,
    progress: (d) => ({ current: Math.min(3, bestHabitStreak(d)), target: 3 }),
  },
  {
    id: "streak_14",
    title: "14 Day Forge",
    description: "Reach a 14-day habit streak.",
    icon: "flame",
    xp: 180,
    rarity: "rare",
    group: "Consistency",
    check: (d) => bestHabitStreak(d) >= 14,
    progress: (d) => ({ current: Math.min(14, bestHabitStreak(d)), target: 14 }),
  },
  {
    id: "streak_60",
    title: "60 Day Unbroken",
    description: "Reach a 60-day habit streak.",
    icon: "swords",
    xp: 450,
    rarity: "epic",
    group: "Consistency",
    check: (d) => bestHabitStreak(d) >= 60,
    progress: (d) => ({ current: Math.min(60, bestHabitStreak(d)), target: 60 }),
  },
  {
    id: "streak_100",
    title: "100 Day Legend",
    description: "Reach a 100-day habit streak.",
    icon: "crown",
    xp: 700,
    rarity: "legendary",
    group: "Consistency",
    check: (d) => bestHabitStreak(d) >= 100,
    progress: (d) => ({ current: Math.min(100, bestHabitStreak(d)), target: 100 }),
  },
  {
    id: "streak_365",
    title: "One Year Strong",
    description: "Reach a 365-day habit streak.",
    icon: "crown",
    xp: 1500,
    rarity: "legendary",
    group: "Consistency",
    check: (d) => bestHabitStreak(d) >= 365,
    progress: (d) => ({ current: Math.min(365, bestHabitStreak(d)), target: 365 }),
  },
  {
    id: "completions_100",
    title: "100 Completions",
    description: "Check off 100 habits.",
    icon: "check",
    xp: 200,
    rarity: "rare",
    group: "Consistency",
    check: (_d, m) => m.habitsCompleted >= 100,
    progress: (_d, m) => ({ current: Math.min(100, m.habitsCompleted), target: 100 }),
  },
  {
    id: "completions_500",
    title: "500 Completions",
    description: "Check off 500 habits.",
    icon: "scroll",
    xp: 500,
    rarity: "epic",
    group: "Consistency",
    check: (_d, m) => m.habitsCompleted >= 500,
    progress: (_d, m) => ({ current: Math.min(500, m.habitsCompleted), target: 500 }),
  },
  {
    id: "perfect_week",
    title: "Perfect Week",
    description: "Complete every planned habit for 7 days in a row.",
    icon: "sparkles",
    xp: 300,
    rarity: "epic",
    group: "Consistency",
    check: (d) => windowScore(7)(d).perfectDays >= 7,
    progress: (d) => ({ current: Math.min(7, windowScore(7)(d).perfectDays), target: 7 }),
  },
  {
    id: "consistency_master",
    title: "Consistency Master",
    description: "Reach 90% habit completion this month.",
    icon: "shield",
    xp: 400,
    rarity: "epic",
    group: "Consistency",
    check: (d) => monthHabitRate(d) >= 90,
    progress: (d) => ({ current: Math.min(90, Math.round(monthHabitRate(d))), target: 90 }),
  },
  {
    id: "perfect_month",
    title: "Perfect Month",
    description: "Reach 95% habit completion this month.",
    icon: "trophy",
    xp: 600,
    rarity: "legendary",
    group: "Consistency",
    check: (d) => monthHabitRate(d) >= 95,
    progress: (d) => ({ current: Math.min(95, Math.round(monthHabitRate(d))), target: 95 }),
  },
  {
    id: "streak_active_30",
    title: "Momentum",
    description: "Hold an active 30-day streak.",
    icon: "flame",
    xp: 350,
    rarity: "epic",
    group: "Consistency",
    check: (d) => currentHabitStreak(d) >= 30,
    progress: (d) => ({ current: Math.min(30, currentHabitStreak(d)), target: 30 }),
  },
];

export const RARITY_STYLES: Record<AchievementDef["rarity"], { color: string; label: string }> = {
  common: { get label() { return tr("rarity.common"); }, color: "#8a97a8" },
  rare: { get label() { return tr("rarity.rare"); }, color: "#22d3ee" },
  epic: { get label() { return tr("rarity.epic"); }, color: "#a78bfa" },
  legendary: { get label() { return tr("rarity.legendary"); }, color: "#f7b955" },
};

/** Returns achievement ids whose conditions are satisfied but not yet unlocked. */
export function evaluateAchievements(data: AppData, m: MetricsContext): string[] {
  const unlocked: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (data.achievements[def.id]?.unlockedAt) continue;
    let ok = false;
    try {
      ok = def.check(data, m);
    } catch {
      ok = false;
    }
    if (ok) unlocked.push(def.id);
  }
  return unlocked;
}

export function achievementProgress(def: AchievementDef, data: AppData, m: MetricsContext) {
  if (data.achievements[def.id]?.unlockedAt) return { current: 1, target: 1, pct: 100 };
  if (!def.progress) return { current: 0, target: 1, pct: 0 };
  const { current, target } = def.progress(data, m);
  const safeTarget = target > 0 ? target : 1;
  return { current, target: safeTarget, pct: Math.min(100, (current / safeTarget) * 100) };
}

export function unlockedCount(data: AppData): number {
  return Object.values(data.achievements).filter((a) => a.unlockedAt).length;
}

export function strongestStatLabel(m: MetricsContext): StatKey {
  return m.strongestStat;
}

/** Every achievement in the game: base progression + habit matrix. */
export const ACHIEVEMENTS: AchievementDef[] = [...BASE_ACHIEVEMENTS, ...HABIT_ACHIEVEMENTS];

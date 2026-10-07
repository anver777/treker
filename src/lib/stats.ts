import type { StatKey } from "@/types";
import { tr } from "@/i18n";

/* ============================================================
   Stat metadata — single source of truth for character stats.
   Labels are getters so they follow the active interface language.
   ============================================================ */

export interface StatMeta {
  key: StatKey;
  label: string;
  short: string;
  icon: string;
  color: string;
  description: string;
}

export const STAT_KEYS: StatKey[] = [
  "strength",
  "intelligence",
  "discipline",
  "career",
  "finance",
  "health",
  "knowledge",
  "social",
];

export const STATS: Record<StatKey, StatMeta> = {
  strength: {
    key: "strength",
    get label() {
      return tr("stats.strength.label");
    },
    get short() {
      return tr("stats.strength.short");
    },
    get description() {
      return tr("stats.strength.desc");
    },
    icon: "dumbbell",
    color: "#fb7185",
  },
  intelligence: {
    key: "intelligence",
    get label() {
      return tr("stats.intelligence.label");
    },
    get short() {
      return tr("stats.intelligence.short");
    },
    get description() {
      return tr("stats.intelligence.desc");
    },
    icon: "brain",
    color: "#a78bfa",
  },
  discipline: {
    key: "discipline",
    get label() {
      return tr("stats.discipline.label");
    },
    get short() {
      return tr("stats.discipline.short");
    },
    get description() {
      return tr("stats.discipline.desc");
    },
    icon: "shield",
    color: "#2fe6a4",
  },
  career: {
    key: "career",
    get label() {
      return tr("stats.career.label");
    },
    get short() {
      return tr("stats.career.short");
    },
    get description() {
      return tr("stats.career.desc");
    },
    icon: "briefcase",
    color: "#22d3ee",
  },
  finance: {
    key: "finance",
    get label() {
      return tr("stats.finance.label");
    },
    get short() {
      return tr("stats.finance.short");
    },
    get description() {
      return tr("stats.finance.desc");
    },
    icon: "wallet",
    color: "#f7b955",
  },
  health: {
    key: "health",
    get label() {
      return tr("stats.health.label");
    },
    get short() {
      return tr("stats.health.short");
    },
    get description() {
      return tr("stats.health.desc");
    },
    icon: "heart",
    color: "#4ade80",
  },
  knowledge: {
    key: "knowledge",
    get label() {
      return tr("stats.knowledge.label");
    },
    get short() {
      return tr("stats.knowledge.short");
    },
    get description() {
      return tr("stats.knowledge.desc");
    },
    icon: "book",
    color: "#60a5fa",
  },
  social: {
    key: "social",
    get label() {
      return tr("stats.social.label");
    },
    get short() {
      return tr("stats.social.short");
    },
    get description() {
      return tr("stats.social.desc");
    },
    icon: "users",
    color: "#f472b6",
  },
};

export interface DifficultyMeta {
  label: string;
  color: string;
  xp: number;
  stars: number;
}

export type DifficultyKey = "easy" | "medium" | "hard" | "epic";

export const DIFFICULTIES: Record<DifficultyKey, DifficultyMeta> = {
  easy: {
    get label() {
      return tr("diff.easy");
    },
    color: "#4ade80",
    xp: 20,
    stars: 1,
  },
  medium: {
    get label() {
      return tr("diff.medium");
    },
    color: "#22d3ee",
    xp: 50,
    stars: 2,
  },
  hard: {
    get label() {
      return tr("diff.hard");
    },
    color: "#f7b955",
    xp: 100,
    stars: 3,
  },
  epic: {
    get label() {
      return tr("diff.epic");
    },
    color: "#a78bfa",
    xp: 200,
    stars: 4,
  },
};

export type QuestCategoryKey = "daily" | "weekly" | "monthly" | "main" | "side";

export const QUEST_CATEGORIES: Record<
  QuestCategoryKey,
  { label: string; short: string }
> = {
  daily: {
    get label() {
      return tr("qcat.daily.full");
    },
    get short() {
      return tr("qcat.daily");
    },
  },
  weekly: {
    get label() {
      return tr("qcat.weekly.full");
    },
    get short() {
      return tr("qcat.weekly");
    },
  },
  monthly: {
    get label() {
      return tr("qcat.monthly.full");
    },
    get short() {
      return tr("qcat.monthly");
    },
  },
  main: {
    get label() {
      return tr("qcat.main.full");
    },
    get short() {
      return tr("qcat.main");
    },
  },
  side: {
    get label() {
      return tr("qcat.side.full");
    },
    get short() {
      return tr("qcat.side");
    },
  },
};

export interface CategoryMeta {
  key: string;
  label: string;
  icon: string;
  color: string;
}

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { key: "food", get label() { return tr("exp.food"); }, icon: "utensils", color: "#f7b955" },
  { key: "transport", get label() { return tr("exp.transport"); }, icon: "car", color: "#22d3ee" },
  { key: "housing", get label() { return tr("exp.housing"); }, icon: "home", color: "#60a5fa" },
  { key: "health", get label() { return tr("exp.health"); }, icon: "heart", color: "#fb7185" },
  { key: "education", get label() { return tr("exp.education"); }, icon: "book", color: "#a78bfa" },
  { key: "entertainment", get label() { return tr("exp.entertainment"); }, icon: "film", color: "#f472b6" },
  { key: "shopping", get label() { return tr("exp.shopping"); }, icon: "shopping-bag", color: "#2fe6a4" },
  { key: "smoking", get label() { return tr("exp.smoking"); }, icon: "cigarette", color: "#94a3b8" },
  { key: "travel", get label() { return tr("exp.travel"); }, icon: "plane", color: "#38bdf8" },
  { key: "subscriptions", get label() { return tr("exp.subscriptions"); }, icon: "repeat", color: "#fbbf24" },
  { key: "other", get label() { return tr("exp.other"); }, icon: "circle", color: "#8a97a8" },
];

export const INCOME_CATEGORIES: CategoryMeta[] = [
  { key: "salary", get label() { return tr("inc.salary"); }, icon: "briefcase", color: "#2fe6a4" },
  { key: "freelance", get label() { return tr("inc.freelance"); }, icon: "laptop", color: "#22d3ee" },
  { key: "business", get label() { return tr("inc.business"); }, icon: "trending-up", color: "#a78bfa" },
  { key: "gift", get label() { return tr("inc.gift"); }, icon: "gift", color: "#f472b6" },
  { key: "investment", get label() { return tr("inc.investment"); }, icon: "line-chart", color: "#60a5fa" },
  { key: "other", get label() { return tr("inc.other"); }, icon: "circle", color: "#8a97a8" },
];

export const GOAL_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  career: { get label() { return tr("goal.career"); }, icon: "briefcase", color: "#22d3ee" },
  finance: { get label() { return tr("goal.finance"); }, icon: "wallet", color: "#f7b955" },
  health: { get label() { return tr("goal.health"); }, icon: "heart", color: "#4ade80" },
  education: { get label() { return tr("goal.education"); }, icon: "book", color: "#a78bfa" },
  travel: { get label() { return tr("goal.travel"); }, icon: "plane", color: "#38bdf8" },
  business: { get label() { return tr("goal.business"); }, icon: "trending-up", color: "#2fe6a4" },
  lifestyle: { get label() { return tr("goal.lifestyle"); }, icon: "sparkles", color: "#f472b6" },
  other: { get label() { return tr("goal.other"); }, icon: "circle", color: "#8a97a8" },
};

export interface HabitCategoryMeta {
  key: string;
  label: string;
  color: string;
}

export const HABIT_CATEGORIES: HabitCategoryMeta[] = [
  { key: "health", get label() { return tr("hcat.health"); }, color: "#4ade80" },
  { key: "career", get label() { return tr("hcat.career"); }, color: "#22d3ee" },
  { key: "finance", get label() { return tr("hcat.finance"); }, color: "#f7b955" },
  { key: "learning", get label() { return tr("hcat.learning"); }, color: "#60a5fa" },
  { key: "discipline", get label() { return tr("hcat.discipline"); }, color: "#2fe6a4" },
  { key: "social", get label() { return tr("hcat.social"); }, color: "#f472b6" },
  { key: "other", get label() { return tr("hcat.other"); }, color: "#8a97a8" },
];

export function habitCategoryLabel(key: string): string {
  return HABIT_CATEGORIES.find((c) => c.key === key)?.label || key;
}

export function habitCategoryColor(key: string): string {
  return HABIT_CATEGORIES.find((c) => c.key === key)?.color || "#8a97a8";
}

export const HABIT_ICONS = [
  "🏋️",
  "📚",
  "💻",
  "🗣️",
  "🚭",
  "😴",
  "🧘",
  "💧",
  "🚶",
  "🏃",
  "🥗",
  "✍️",
  "🎯",
  "☀️",
  "🎸",
  "💰",
];

export const HABIT_COLORS = [
  "#2fe6a4",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#f7b955",
  "#fb7185",
  "#4ade80",
];

/** Stored title keys — displayed through the active language. */
export const TITLES = [
  "Novice",
  "Disciplined",
  "Builder",
  "Explorer",
  "Money Maker",
  "Scholar",
  "Warrior",
  "Legend",
];

export function titleOptions(): { value: string; label: string }[] {
  return TITLES.map((t) => ({ value: t, label: tr(`title.${t}`) }));
}

export function titleLabel(key: string): string {
  return tr(`title.${key}`);
}

export function expenseLabel(key: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.key === key)?.label || key;
}

export function incomeLabel(key: string): string {
  return INCOME_CATEGORIES.find((c) => c.key === key)?.label || key;
}

export function categoryLabel(key: string, type: "income" | "expense"): string {
  return type === "income" ? incomeLabel(key) : expenseLabel(key);
}

export function categoryColor(key: string, type: "income" | "expense"): string {
  const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.key === key)?.color || "#8a97a8";
}

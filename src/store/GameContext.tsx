import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  AchievementUnlock,
  ActivityKind,
  AppData,
  Goal,
  Habit,
  LevelUpPayload,
  NewUserInput,
  Quest,
  Settings,
  StatKey,
  Transaction,
  XPGain,
} from "@/types";
import { ACHIEVEMENTS, evaluateAchievements } from "@/lib/achievements";
import { habitsOverview, metricsContext, habitStreak } from "@/lib/selectors";
import { habitStatXpSplit } from "@/lib/habitMatrix";
import { applyMultiplier, levelInfo, statAddXp, xpMultiplier } from "@/lib/xp";
import { STAT_KEYS } from "@/lib/stats";
import { todayISO } from "@/lib/date";
import { createDemoData, createEmptyData } from "@/lib/demoData";
import { tr } from "@/i18n";
import { clamp } from "@/lib/format";

const STORAGE_KEY = "life-rpg.state.v1";
const ACTIVITY_LIMIT = 1500;

export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ============================================================
   Runtime (non persisted) UI payload
   ============================================================ */

export interface RuntimeUi {
  xpGains: XPGain[];
  statLevelUps: { id: string; stat: StatKey; level: number }[];
  levelUp: LevelUpPayload | null;
  achievementUnlocks: AchievementUnlock[];
  lastAction: string | null;
}

interface AppState {
  data: AppData;
  ui: RuntimeUi;
}

interface AwardRequest {
  base: number;
  kind: ActivityKind;
  title: string;
  detail: string;
  stat: StatKey | null;
  /** Explicit per-stat XP split. When omitted, `base / 4` goes to `stat`. */
  statXp?: Partial<Record<StatKey, number>>;
}

export type QuestInput = Omit<Quest, "id" | "completed" | "completedAt" | "createdAt" | "progress"> & {
  progress?: number;
};
export type HabitInput = Omit<
  Habit,
  "id" | "completions" | "bestStreak" | "createdAt" | "archived" | "totalXpEarned"
> & { totalXpEarned?: number };
export type GoalInput = Omit<Goal, "id" | "createdAt" | "completedAt">;

type Action =
  | { type: "START_JOURNEY"; payload: NewUserInput }
  | { type: "LOAD_DEMO" }
  | { type: "RESET_ALL" }
  | { type: "IMPORT"; payload: AppData }
  | { type: "UPDATE_PROFILE"; payload: Partial<AppData["profile"]> }
  | { type: "UPDATE_SETTINGS"; payload: Partial<Settings> }
  | { type: "SET_AVATAR"; payload: string | null }
  | { type: "ADD_QUEST"; payload: QuestInput }
  | { type: "UPDATE_QUEST"; payload: { id: string; patch: Partial<Quest> } }
  | { type: "DELETE_QUEST"; payload: { id: string } }
  | { type: "TOGGLE_QUEST"; payload: { id: string } }
  | { type: "QUEST_PROGRESS"; payload: { id: string; value: number } }
  | { type: "ADD_HABIT"; payload: HabitInput }
  | { type: "UPDATE_HABIT"; payload: { id: string; patch: Partial<Habit> } }
  | { type: "DELETE_HABIT"; payload: { id: string } }
  | { type: "TOGGLE_HABIT"; payload: { id: string; iso?: string } }
  | { type: "SET_HABIT_STATUS"; payload: { id: string; status: Habit["status"] } }
  | { type: "PAUSE_HABIT"; payload: { id: string; until: string | null } }
  | { type: "ADD_GOAL"; payload: GoalInput }
  | { type: "UPDATE_GOAL"; payload: { id: string; patch: Partial<Goal> } }
  | { type: "DELETE_GOAL"; payload: { id: string } }
  | { type: "GOAL_PROGRESS"; payload: { id: string; value: number } }
  | { type: "TOGGLE_MILESTONE"; payload: { goalId: string; milestoneId: string } }
  | { type: "ADD_MILESTONE"; payload: { goalId: string; text: string } }
  | { type: "REMOVE_MILESTONE"; payload: { goalId: string; milestoneId: string } }
  | { type: "TOGGLE_GOAL"; payload: { id: string } }
  | { type: "ADD_TRANSACTION"; payload: Omit<Transaction, "id"> }
  | { type: "DELETE_TRANSACTION"; payload: { id: string } }
  | { type: "SET_JOURNAL"; payload: { iso: string; patch: { mood?: number; note?: string } } }
  | { type: "READ_NOTIFICATIONS" }
  | { type: "DELETE_NOTIFICATION"; payload: { id: string } }
  | { type: "CLEAR_NOTIFICATIONS" }
  | { type: "SPEND_POINT"; payload: { stat: StatKey } }
  | { type: "BONUS_XP"; payload: { amount: number; title: string; stat: StatKey | null } }
  | { type: "DISMISS_XP"; payload: { id: string } }
  | { type: "DISMISS_STAT_UP"; payload: { id: string } }
  | { type: "DISMISS_LEVEL_UP" }
  | { type: "DISMISS_ACHIEVEMENT" }
  | { type: "HYDRATE"; payload: AppData };

/** Never returns NaN / negative XP. */
function safeXp(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/** True when the quest carries progress that came from a linked habit. */
function questHasLinkedProgress(quest: { progress: number }): boolean {
  return quest.progress > 0;
}

/** XP that was revoked for a given habit on a date (used to decrement habit.totalXpEarned). */
function restoredXp(after: AppData, before: AppData, title: string, iso: string): number {
  const sum = (d: AppData) =>
    d.activity
      .filter((a) => a.kind === "habit" && a.title === title && a.createdAt.slice(0, 10) === iso)
      .reduce((s, a) => s + safeXp(a.xp), 0);
  const removed = sum(before) - sum(after);
  return Math.max(0, removed);
}

const emptyUi: RuntimeUi = {
  xpGains: [],
  statLevelUps: [],
  levelUp: null,
  achievementUnlocks: [],
  lastAction: null,
};

/* ============================================================
   Hydration + validation
   ============================================================ */

function baseData(): AppData {
  return createEmptyData("Player", null, "");
}

function normalize(input: unknown): AppData {
  const base = baseData();
  if (!input || typeof input !== "object") return base;
  const raw = input as Partial<AppData>;
  const stats = { ...base.stats };
  if (raw.stats && typeof raw.stats === "object") {
    for (const key of STAT_KEYS) {
      const s = (raw.stats as Record<string, { level?: number; xp?: number }>)[key];
      stats[key] = {
        level: Math.max(1, Math.floor(Number(s?.level) || 1)),
        xp: Math.max(0, Math.floor(Number(s?.xp) || 0)),
      };
    }
  }
  const habits = (Array.isArray(raw.habits) ? (raw.habits as unknown as Partial<Habit>[]) : []).map(
    (h) => migrateHabit(h as Partial<Habit> & Record<string, unknown>),
  );
  return {
    version: 1,
    onboarded: Boolean(raw.onboarded),
    profile: { ...base.profile, ...(raw.profile || {}) },
    stats,
    quests: (Array.isArray(raw.quests) ? raw.quests : []).map((q) => ({
      ...q,
      linkedHabitId: q.linkedHabitId ?? null,
    })),
    habits,
    goals: Array.isArray(raw.goals) ? raw.goals : [],
    achievements: raw.achievements && typeof raw.achievements === "object" ? raw.achievements : {},
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
    activity: Array.isArray(raw.activity) ? raw.activity : [],
    journal: raw.journal && typeof raw.journal === "object" ? raw.journal : {},
    notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
    settings: { ...base.settings, ...(raw.settings || {}) },
  };
}

/** Brings older saves up to the current Habit shape. */
function migrateHabit(raw: Partial<Habit> & Record<string, unknown>): Habit {
  const stat = (raw.stat || "discipline") as Habit["stat"];
  const stats = Array.isArray(raw.stats) && raw.stats.length > 0 ? (raw.stats as StatKey[]) : [stat];
  const status =
    raw.status === "paused" || raw.status === "archived" || raw.status === "active"
      ? (raw.status as Habit["status"])
      : raw.archived
        ? "archived"
        : "active";
  return {
    id: String(raw.id || uid("h")),
    name: String(raw.name || "Habit"),
    icon: String(raw.icon || "🎯"),
    stat,
    stats,
    xp: Math.max(1, Math.min(200, Math.floor(Number(raw.xp) || 15))),
    color: String(raw.color || "#2fe6a4"),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    completions: Array.isArray(raw.completions)
      ? raw.completions.filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
      : [],
    bestStreak: Math.max(0, Math.floor(Number(raw.bestStreak) || 0)),
    archived: status === "archived",
    status,
    description: String(raw.description || ""),
    category: (raw.category as Habit["category"]) || "other",
    frequency: (raw.frequency as Habit["frequency"]) || "daily",
    customDays: Array.isArray(raw.customDays) ? (raw.customDays as number[]).filter((d) => d >= 0 && d <= 6) : [],
    startDate: String(raw.startDate || (raw.createdAt || new Date().toISOString()).slice(0, 10)),
    pausedFrom: (raw.pausedFrom as string | null) ?? null,
    pausedUntil: (raw.pausedUntil as string | null) ?? null,
    goalId: (raw.goalId as string | null) ?? null,
    reminder: String(raw.reminder || ""),
    totalXpEarned: Math.max(0, Math.floor(Number(raw.totalXpEarned) || 0)),
  };
}

function readStored(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

/* ============================================================
   XP engine
   ============================================================ */

function revokeAward(
  data: AppData,
  match: { kind: ActivityKind; title: string; dateISO: string; statXp?: Partial<Record<StatKey, number>> },
): AppData {
  const idx = data.activity.findIndex(
    (a) =>
      a.kind === match.kind &&
      a.title === match.title &&
      a.createdAt.slice(0, 10) === match.dateISO,
  );
  if (idx === -1) return data;
  const event = data.activity[idx];
  const activity = data.activity.filter((_, i) => i !== idx);
  const stats = { ...data.stats };
  const split: Partial<Record<StatKey, number>> =
    event.statXp && Object.keys(event.statXp).length > 0
      ? event.statXp
      : event.stat
        ? { [event.stat]: Math.max(1, Math.round(event.xp / 4)) }
        : {};
  for (const [key, value] of Object.entries(split) as [StatKey, number][]) {
    const cur = stats[key] || { level: 1, xp: 0 };
    const deducted = Math.max(1, Math.round(value));
    if (cur.xp >= deducted) {
      stats[key] = { level: cur.level, xp: cur.xp - deducted };
    } else if (cur.level > 1) {
      stats[key] = { level: cur.level - 1, xp: 0 };
    } else {
      stats[key] = { level: 1, xp: 0 };
    }
  }
  return {
    ...data,
    activity,
    stats,
    profile: { ...data.profile, totalXp: Math.max(0, data.profile.totalXp - event.xp) },
  };
}

function commit(state: AppState, data: AppData, awards: AwardRequest[], label: string): AppState {
  let next = data;
  const gains: XPGain[] = [];
  const statUps: { id: string; stat: StatKey; level: number }[] = [];
  const now = () => new Date().toISOString();
  const today = todayISO();
  const levelBefore = levelInfo(next.profile.totalXp).level;

  for (const award of awards) {
    const base = Math.max(0, Math.round(award.base));
    if (base <= 0) continue;
    const firstOfDay = !next.activity.some((a) => a.createdAt.slice(0, 10) === today);
    const streak = habitsOverview(next.habits, today).currentStreak;
    const mult = xpMultiplier(levelBefore, streak, firstOfDay);
    const amount = applyMultiplier(base, mult);
    const stats = { ...next.stats };
    const split: Partial<Record<StatKey, number>> =
      award.statXp && Object.keys(award.statXp).length > 0
        ? award.statXp
        : award.stat
          ? { [award.stat]: Math.max(1, Math.round(amount / 4)) }
          : {};
    for (const [key, value] of Object.entries(split) as [StatKey, number][]) {
      const cur = stats[key] || { level: 1, xp: 0 };
      const res = statAddXp(cur.level, cur.xp, Math.max(1, Math.round(value)));
      stats[key] = { level: res.level, xp: res.xpIntoLevel };
      if (res.leveledUp) {
        statUps.push({ id: uid("sup"), stat: key, level: res.level });
      }
    }
    const id = uid("act");
    next = {
      ...next,
      stats,
      profile: { ...next.profile, totalXp: next.profile.totalXp + amount },
      activity: [
        {
          id,
          kind: award.kind,
          title: award.title,
          detail: award.detail,
          xp: amount,
          stat: award.stat,
          statXp: Object.keys(split).length > 0 ? split : undefined,
          createdAt: now(),
        },
        ...next.activity,
      ].slice(0, ACTIVITY_LIMIT),
    };
    gains.push({
      id,
      amount,
      stat: award.stat,
      label: mult.total > 1 ? `${award.title} · ×${mult.total.toFixed(2)} bonus` : award.title,
    });
  }

  const metrics = metricsContext(next);
  const newAchievements = evaluateAchievements(next, metrics);
  if (newAchievements.length > 0) {
    const achievements = { ...next.achievements };
    const activity = [...next.activity];
    const notifications = [...next.notifications];
    const unlocks: AchievementUnlock[] = [];
    let bonus = 0;
    for (const id of newAchievements) {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (!def) continue;
      achievements[id] = { unlockedAt: now(), seen: false };
      unlocks.push({
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        xp: def.xp,
      });
      bonus += def.xp;
      activity.unshift({
        id: uid("act"),
        kind: "achievement",
        title: def.title,
        detail: "Achievement unlocked",
        xp: def.xp,
        stat: null,
        createdAt: now(),
      });
      notifications.unshift({
        id: uid("n"),
        kind: "achievement",
        title: "🏆 Achievement unlocked!",
        body: `You unlocked “${def.title}”.`,
        createdAt: now(),
        read: false,
      });
    }
    next = {
      ...next,
      achievements,
      notifications: notifications.slice(0, 40),
      activity: activity.slice(0, ACTIVITY_LIMIT),
      profile: { ...next.profile, totalXp: next.profile.totalXp + bonus },
    };
    state = {
      ...state,
      ui: {
        ...state.ui,
        achievementUnlocks:
          state.ui.achievementUnlocks.length > 0 ? state.ui.achievementUnlocks : unlocks,
      },
    };
  }

  const levelAfter = levelInfo(next.profile.totalXp);
  let levelUp = state.ui.levelUp;
  let points = next.profile.characterPoints;
  if (levelAfter.level > levelBefore) {
    const gained = levelAfter.level - levelBefore;
    points += gained;
    levelUp = {
      from: levelBefore,
      to: levelAfter.level,
      characterPoint: gained,
      multiplierBonus: gained * 0.02,
    };
    const notifications = [
      {
        id: uid("n"),
        kind: "level" as const,
        title: "🎉 Level Up!",
        body: `You reached Level ${levelAfter.level}.`,
        createdAt: now(),
        read: false,
      },
      ...next.notifications,
    ].slice(0, 40);
    next = { ...next, notifications };
  }

  return {
    data: { ...next, profile: { ...next.profile, characterPoints: points } },
    ui: {
      ...state.ui,
      xpGains: [...state.ui.xpGains, ...gains].slice(-4),
      statLevelUps: [...state.ui.statLevelUps, ...statUps].slice(-4),
      levelUp,
      lastAction: label,
    },
  };
}

/* ============================================================
   Reducer
   ============================================================ */

/** Exported for verification/tests — it is a pure function. */
export function reducer(state: AppState, action: Action): AppState {
  const { data } = state;
  switch (action.type) {
    case "HYDRATE":
      return { data: normalize(action.payload), ui: emptyUi };

    case "START_JOURNEY": {
      const created = action.payload.withDemo
        ? (() => {
            const demo = createDemoData();
            return {
              ...demo,
              profile: {
                ...demo.profile,
                name: action.payload.name.trim() || demo.profile.name,
                avatar: action.payload.avatar,
                mainGoal: action.payload.mainGoal.trim() || demo.profile.mainGoal,
              },
            };
          })()
        : createEmptyData(
            action.payload.name,
            action.payload.avatar,
            action.payload.mainGoal,
          );
      return { data: created, ui: { ...emptyUi, lastAction: "start" } };
    }

    case "LOAD_DEMO":
      return { data: createDemoData(), ui: { ...emptyUi, lastAction: "demo" } };

    case "RESET_ALL":
      return { data: { ...baseData(), onboarded: false }, ui: emptyUi };

    case "IMPORT":
      return { data: normalize(action.payload), ui: { ...emptyUi, lastAction: "import" } };

    case "UPDATE_PROFILE":
      return {
        ...state,
        data: { ...data, profile: { ...data.profile, ...action.payload } },
      };

    case "UPDATE_SETTINGS":
      return {
        ...state,
        data: { ...data, settings: { ...data.settings, ...action.payload } },
      };

    case "SET_AVATAR":
      return {
        ...state,
        data: { ...data, profile: { ...data.profile, avatar: action.payload } },
      };

    case "ADD_QUEST": {
      const quest: Quest = {
        ...action.payload,
        progress: clamp(Math.round(action.payload.progress || 0), 0, 100),
        id: uid("q"),
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      return { ...state, data: { ...data, quests: [quest, ...data.quests] } };
    }

    case "UPDATE_QUEST":
      return {
        ...state,
        data: {
          ...data,
          quests: data.quests.map((q) =>
            q.id === action.payload.id
              ? { ...q, ...action.payload.patch, progress: clamp(q.progress, 0, 100) }
              : q,
          ),
        },
      };

    case "DELETE_QUEST":
      return {
        ...state,
        data: { ...data, quests: data.quests.filter((q) => q.id !== action.payload.id) },
      };

    case "TOGGLE_QUEST": {
      const quest = data.quests.find((q) => q.id === action.payload.id);
      if (!quest) return state;
      if (quest.completed) {
        const restored = revokeAward(data, {
          kind: "quest",
          title: quest.title,
          dateISO: quest.completedAt?.slice(0, 10) || todayISO(),
        });
        return {
          ...state,
          data: {
            ...restored,
            quests: restored.quests.map((q) =>
              q.id === quest.id
                ? { ...q, completed: false, completedAt: null, progress: Math.min(q.progress, 95) }
                : q,
            ),
          },
        };
      }
      const updated: AppData = {
        ...data,
        quests: data.quests.map((q) =>
          q.id === quest.id
            ? { ...q, completed: true, completedAt: new Date().toISOString(), progress: 100 }
            : q,
        ),
      };
      return commit(state, updated, [
        {
          base: quest.xp,
          kind: "quest",
          title: quest.title,
          detail: "Quest completed",
          stat: quest.stat,
        },
      ], "quest-complete");
    }

    case "QUEST_PROGRESS": {
      const quest = data.quests.find((q) => q.id === action.payload.id);
      if (!quest) return state;
      const value = clamp(Math.round(action.payload.value), 0, 100);
      const updated: AppData = {
        ...data,
        quests: data.quests.map((q) => (q.id === quest.id ? { ...q, progress: value } : q)),
      };
      if (value >= 100 && !quest.completed) {
        return commit(
          state,
          {
            ...updated,
            quests: updated.quests.map((q) =>
              q.id === quest.id
                ? { ...q, completed: true, completedAt: new Date().toISOString(), progress: 100 }
                : q,
            ),
          },
          [
            {
              base: quest.xp,
              kind: "quest",
              title: quest.title,
              detail: "Quest completed",
              stat: quest.stat,
            },
          ],
          "quest-complete",
        );
      }
      if (value < 100 && quest.completed) {
        return {
          ...state,
          data: {
            ...updated,
            quests: updated.quests.map((q) =>
              q.id === quest.id ? { ...q, completed: false, completedAt: null } : q,
            ),
          },
        };
      }
      return { ...state, data: updated };
    }

    case "ADD_HABIT": {
      const habit: Habit = {
        ...action.payload,
        totalXpEarned: Math.max(0, Math.floor(action.payload.totalXpEarned || 0)),
        stats:
          Array.isArray(action.payload.stats) && action.payload.stats.length > 0
            ? action.payload.stats
            : [action.payload.stat],
        id: uid("h"),
        completions: [],
        bestStreak: 0,
        archived: false,
        createdAt: new Date().toISOString(),
      };
      return { ...state, data: { ...data, habits: [...data.habits, habit] } };
    }

    case "UPDATE_HABIT":
      return {
        ...state,
        data: {
          ...data,
          habits: data.habits.map((h) =>
            h.id === action.payload.id ? { ...h, ...action.payload.patch } : h,
          ),
        },
      };

    case "DELETE_HABIT":
      return {
        ...state,
        data: { ...data, habits: data.habits.filter((h) => h.id !== action.payload.id) },
      };

    case "TOGGLE_HABIT": {
      const iso = action.payload.iso || todayISO();
      const habit = data.habits.find((h) => h.id === action.payload.id);
      if (!habit) return state;
      const done = habit.completions.includes(iso);

      if (done) {
        // ---- Uncomplete: reverse XP, stats, streak and linked quest progress ----
        const restored = revokeAward(data, { kind: "habit", title: habit.name, dateISO: iso });
        let nextData: AppData = {
          ...restored,
          habits: restored.habits.map((h) =>
            h.id === habit.id
              ? {
                  ...h,
                  completions: h.completions.filter((d) => d !== iso),
                  totalXpEarned: Math.max(0, safeXp(h.totalXpEarned) - restoredXp(restored, data, habit.name, iso)),
                }
              : h,
          ),
        };
        // Roll back linked quest progress (un-completing it if this was the final step)
        for (const quest of data.quests) {
          if (quest.linkedHabitId !== habit.id) continue;
          if (!questHasLinkedProgress(quest)) continue;
          const step = 100 / Math.max(1, quest.target);
          nextData = reducer(
            { ...state, data: nextData },
            { type: "QUEST_PROGRESS", payload: { id: quest.id, value: quest.progress - step } },
          ).data;
        }
        return { ...state, data: nextData };
      }

      // ---- Complete: award XP, stats, streak and linked quest progress ----
      const withCompletion: AppData = {
        ...data,
        habits: data.habits.map((h) =>
          h.id === habit.id ? { ...h, completions: [...h.completions, iso] } : h,
        ),
      };
      // Recompute best streak from the real completion set
      const updatedHabit = withCompletion.habits.find((h) => h.id === habit.id) as Habit;
      const streakInfo = habitStreak(updatedHabit, iso);
      const withStreak: AppData = {
        ...withCompletion,
        habits: withCompletion.habits.map((h) =>
          h.id === habit.id ? { ...h, bestStreak: Math.max(h.bestStreak, streakInfo.best) } : h,
        ),
      };

      const streakForBonus = streakInfo.current;
      const levelBefore = levelInfo(data.profile.totalXp).level;
      const firstOfDay = !data.activity.some((a) => a.createdAt.slice(0, 10) === iso);
      const mult = xpMultiplier(levelBefore, streakForBonus, firstOfDay);
      const base = Math.max(1, Math.round(habit.xp));
      const amount = Math.max(base, applyMultiplier(base, mult));
      const statXp = habitStatXpSplit(habit, amount);

      let notifications = data.notifications;
      if (streakForBonus > 0 && streakForBonus % 7 === 0) {
        notifications = [
          {
            id: uid("n"),
            kind: "streak" as const,
            title: tr("notif.streakTitle"),
            body: tr("notif.streakBody", { habit: habit.name, n: streakForBonus }),
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...data.notifications,
        ].slice(0, 40);
      }

      const committed = commit(
        state,
        { ...withStreak, notifications },
        [
          {
            base,
            kind: "habit",
            title: habit.name,
            detail:
              mult.streakBonus > 0
                ? `${tr("habits.streakBonusLabel")} +${Math.round(mult.streakBonus * 100)}%`
                : tr("habits.habitCompleted"),
            stat: habit.stat,
            statXp,
          },
        ],
        "habit-complete",
      );

      // Track XP earned per habit + advance linked quests
      let nextData: AppData = {
        ...committed.data,
        habits: committed.data.habits.map((h) =>
          h.id === habit.id ? { ...h, totalXpEarned: safeXp(h.totalXpEarned) + amount } : h,
        ),
      };
      for (const quest of nextData.quests) {
        if (quest.linkedHabitId !== habit.id || quest.completed) continue;
        const step = 100 / Math.max(1, quest.target);
        nextData = reducer(
          { ...state, data: nextData, ui: committed.ui },
          { type: "QUEST_PROGRESS", payload: { id: quest.id, value: quest.progress + step } },
        ).data;
      }
      return { ...state, data: nextData, ui: committed.ui };
    }

    case "SET_HABIT_STATUS":
      return {
        ...state,
        data: {
          ...data,
          habits: data.habits.map((h) =>
            h.id === action.payload.id
              ? {
                  ...h,
                  status: action.payload.status,
                  archived: action.payload.status === "archived",
                  pausedFrom: action.payload.status === "paused" ? todayISO() : h.pausedFrom,
                }
              : h,
          ),
        },
      };

    case "PAUSE_HABIT":
      return {
        ...state,
        data: {
          ...data,
          habits: data.habits.map((h) =>
            h.id === action.payload.id
              ? {
                  ...h,
                  pausedUntil: action.payload.until,
                  pausedFrom: action.payload.until ? todayISO() : null,
                  status: action.payload.until ? "paused" : "active",
                }
              : h,
          ),
        },
      };

    case "ADD_GOAL": {
      const goal: Goal = {
        ...action.payload,
        progress: clamp(Math.round(action.payload.progress), 0, 100),
        id: uid("g"),
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      return { ...state, data: { ...data, goals: [goal, ...data.goals] } };
    }

    case "UPDATE_GOAL":
      return {
        ...state,
        data: {
          ...data,
          goals: data.goals.map((g) =>
            g.id === action.payload.id ? { ...g, ...action.payload.patch } : g,
          ),
        },
      };

    case "DELETE_GOAL":
      return {
        ...state,
        data: { ...data, goals: data.goals.filter((g) => g.id !== action.payload.id) },
      };

    case "GOAL_PROGRESS": {
      const goal = data.goals.find((g) => g.id === action.payload.id);
      if (!goal) return state;
      const value = clamp(Math.round(action.payload.value), 0, 100);
      const updated: AppData = {
        ...data,
        goals: data.goals.map((g) => (g.id === goal.id ? { ...g, progress: value } : g)),
      };
      if (value >= 100 && !goal.completedAt) {
        return commit(
          state,
          {
            ...updated,
            goals: updated.goals.map((g) =>
              g.id === goal.id ? { ...g, completedAt: new Date().toISOString(), progress: 100 } : g,
            ),
          },
          [{ base: goal.xp, kind: "goal", title: goal.title, detail: "Goal completed", stat: goal.stat }],
          "goal-complete",
        );
      }
      if (value < 100 && goal.completedAt) {
        return {
          ...state,
          data: {
            ...updated,
            goals: updated.goals.map((g) =>
              g.id === goal.id ? { ...g, completedAt: null } : g,
            ),
          },
        };
      }
      return { ...state, data: updated };
    }

    case "TOGGLE_GOAL": {
      const goal = data.goals.find((g) => g.id === action.payload.id);
      if (!goal) return state;
      return reducer(state, {
        type: "GOAL_PROGRESS",
        payload: { id: goal.id, value: goal.completedAt ? Math.max(0, goal.progress - 1) : 100 },
      });
    }

    case "TOGGLE_MILESTONE": {
      const goal = data.goals.find((g) => g.id === action.payload.goalId);
      if (!goal) return state;
      const milestones = goal.milestones.map((m) =>
        m.id === action.payload.milestoneId ? { ...m, done: !m.done } : m,
      );
      const doneCount = milestones.filter((m) => m.done).length;
      const progress =
        milestones.length > 0 ? Math.round((doneCount / milestones.length) * 100) : goal.progress;
      return reducer(state, {
        type: "GOAL_PROGRESS",
        payload: { id: goal.id, value: goal.completedAt ? Math.min(99, progress) : progress },
      });
    }

    case "ADD_MILESTONE":
      return {
        ...state,
        data: {
          ...data,
          goals: data.goals.map((g) =>
            g.id === action.payload.goalId
              ? {
                  ...g,
                  milestones: [
                    ...g.milestones,
                    { id: uid("m"), text: action.payload.text.trim(), done: false },
                  ],
                }
              : g,
          ),
        },
      };

    case "REMOVE_MILESTONE":
      return {
        ...state,
        data: {
          ...data,
          goals: data.goals.map((g) =>
            g.id === action.payload.goalId
              ? {
                  ...g,
                  milestones: g.milestones.filter((m) => m.id !== action.payload.milestoneId),
                }
              : g,
          ),
        },
      };

    case "ADD_TRANSACTION": {
      const tx: Transaction = {
        ...action.payload,
        id: uid("tx"),
        amount: Math.max(0, Math.round(action.payload.amount)),
      };
      const withTx: AppData = {
        ...data,
        transactions: [tx, ...data.transactions],
      };
      const awards: AwardRequest[] = [];
      if (tx.type === "income" && tx.amount > 0) {
        awards.push({
          base: Math.min(250, Math.max(10, Math.round(tx.amount / 1000))),
          kind: "finance",
          title: "Income logged",
          detail: `+${tx.amount} ${data.profile.currency} · ${tx.category}`,
          stat: "finance",
        });
      }
      return awards.length > 0
        ? commit(state, withTx, awards, "income")
        : { ...state, data: withTx };
    }

    case "DELETE_TRANSACTION":
      return {
        ...state,
        data: { ...data, transactions: data.transactions.filter((t) => t.id !== action.payload.id) },
      };

    case "SET_JOURNAL":
      return {
        ...state,
        data: {
          ...data,
          journal: {
            ...data.journal,
            [action.payload.iso]: {
              mood: clamp(action.payload.patch.mood ?? data.journal[action.payload.iso]?.mood ?? 5, 1, 10),
              note: action.payload.patch.note ?? data.journal[action.payload.iso]?.note ?? "",
            },
          },
        },
      };

    case "READ_NOTIFICATIONS":
      return {
        ...state,
        data: {
          ...data,
          notifications: data.notifications.map((n) => ({ ...n, read: true })),
          achievements: Object.fromEntries(
            Object.entries(data.achievements).map(([k, v]) => [k, { ...v, seen: true }]),
          ),
        },
      };

    case "DELETE_NOTIFICATION":
      return {
        ...state,
        data: {
          ...data,
          notifications: data.notifications.filter((n) => n.id !== action.payload.id),
        },
      };

    case "CLEAR_NOTIFICATIONS":
      return { ...state, data: { ...data, notifications: [] } };

    case "SPEND_POINT": {
      if (data.profile.characterPoints <= 0) return state;
      const cur = data.stats[action.payload.stat] || { level: 1, xp: 0 };
      return {
        ...state,
        data: {
          ...data,
          profile: {
            ...data.profile,
            characterPoints: data.profile.characterPoints - 1,
            spentPoints: data.profile.spentPoints + 1,
          },
          stats: {
            ...data.stats,
            [action.payload.stat]: { level: cur.level + 1, xp: cur.xp },
          },
        },
      };
    }

    case "BONUS_XP":
      return commit(
        state,
        data,
        [
          {
            base: clamp(Math.round(action.payload.amount), 1, 1000),
            kind: "manual",
            title: action.payload.title,
            detail: "Manual XP reward",
            stat: action.payload.stat,
          },
        ],
        "bonus",
      );

    case "DISMISS_XP":
      return {
        ...state,
        ui: { ...state.ui, xpGains: state.ui.xpGains.filter((g) => g.id !== action.payload.id) },
      };

    case "DISMISS_STAT_UP":
      return {
        ...state,
        ui: {
          ...state.ui,
          statLevelUps: state.ui.statLevelUps.filter((s) => s.id !== action.payload.id),
        },
      };

    case "DISMISS_LEVEL_UP":
      return { ...state, ui: { ...state.ui, levelUp: null } };

    case "DISMISS_ACHIEVEMENT":
      return { ...state, ui: { ...state.ui, achievementUnlocks: [] } };

    default:
      return state;
  }
}

/* ============================================================
   Context
   ============================================================ */

export interface GameApi {
  data: AppData;
  ui: RuntimeUi;
  hydrated: boolean;
  startJourney: (input: NewUserInput) => void;
  loadDemo: () => void;
  resetAll: () => void;
  importData: (json: unknown) => { ok: boolean; error?: string };
  updateProfile: (patch: Partial<AppData["profile"]>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setAvatar: (value: string | null) => void;
  addQuest: (input: QuestInput) => void;
  updateQuest: (id: string, patch: Partial<Quest>) => void;
  deleteQuest: (id: string) => void;
  toggleQuest: (id: string) => void;
  setQuestProgress: (id: string, value: number) => void;
  addHabit: (input: HabitInput) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, iso?: string) => void;
  setHabitStatus: (id: string, status: Habit["status"]) => void;
  pauseHabit: (id: string, until: string | null) => void;
  addGoal: (input: GoalInput) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setGoalProgress: (id: string, value: number) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  addMilestone: (goalId: string, text: string) => void;
  removeMilestone: (goalId: string, milestoneId: string) => void;
  toggleGoal: (id: string) => void;
  addTransaction: (input: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;
  setJournal: (iso: string, patch: { mood?: number; note?: string }) => void;
  readNotifications: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  spendPoint: (stat: StatKey) => void;
  addBonusXp: (amount: number, title: string, stat: StatKey | null) => void;
  dismissXp: (id: string) => void;
  dismissStatUp: (id: string) => void;
  dismissLevelUp: () => void;
  dismissAchievement: () => void;
}

const GameContext = createContext<GameApi | null>(null);

type DispatchApi = Omit<GameApi, "data" | "ui" | "hydrated">;

function makeApi(dispatch: React.Dispatch<Action>): DispatchApi {
  return {
    startJourney: (input) => dispatch({ type: "START_JOURNEY", payload: input }),
    loadDemo: () => dispatch({ type: "LOAD_DEMO" }),
    resetAll: () => dispatch({ type: "RESET_ALL" }),
    importData: (json) => {
      if (!json || typeof json !== "object" || Array.isArray(json)) {
        return { ok: false, error: "This file does not look like a LIFE RPG backup." };
      }
      dispatch({ type: "IMPORT", payload: normalize(json) });
      return { ok: true };
    },
    updateProfile: (patch) => dispatch({ type: "UPDATE_PROFILE", payload: patch }),
    updateSettings: (patch) => dispatch({ type: "UPDATE_SETTINGS", payload: patch }),
    setAvatar: (value) => dispatch({ type: "SET_AVATAR", payload: value }),
    addQuest: (input) => dispatch({ type: "ADD_QUEST", payload: input }),
    updateQuest: (id, patch) => dispatch({ type: "UPDATE_QUEST", payload: { id, patch } }),
    deleteQuest: (id) => dispatch({ type: "DELETE_QUEST", payload: { id } }),
    toggleQuest: (id) => dispatch({ type: "TOGGLE_QUEST", payload: { id } }),
    setQuestProgress: (id, value) => dispatch({ type: "QUEST_PROGRESS", payload: { id, value } }),
    addHabit: (input) => dispatch({ type: "ADD_HABIT", payload: input }),
    updateHabit: (id, patch) => dispatch({ type: "UPDATE_HABIT", payload: { id, patch } }),
    deleteHabit: (id) => dispatch({ type: "DELETE_HABIT", payload: { id } }),
    toggleHabit: (id, iso) => dispatch({ type: "TOGGLE_HABIT", payload: { id, iso } }),
    setHabitStatus: (id, status) =>
      dispatch({ type: "SET_HABIT_STATUS", payload: { id, status } }),
    pauseHabit: (id, until) => dispatch({ type: "PAUSE_HABIT", payload: { id, until } }),
    addGoal: (input) => dispatch({ type: "ADD_GOAL", payload: input }),
    updateGoal: (id, patch) => dispatch({ type: "UPDATE_GOAL", payload: { id, patch } }),
    deleteGoal: (id) => dispatch({ type: "DELETE_GOAL", payload: { id } }),
    setGoalProgress: (id, value) => dispatch({ type: "GOAL_PROGRESS", payload: { id, value } }),
    toggleMilestone: (goalId, milestoneId) =>
      dispatch({ type: "TOGGLE_MILESTONE", payload: { goalId, milestoneId } }),
    addMilestone: (goalId, text) => dispatch({ type: "ADD_MILESTONE", payload: { goalId, text } }),
    removeMilestone: (goalId, milestoneId) =>
      dispatch({ type: "REMOVE_MILESTONE", payload: { goalId, milestoneId } }),
    toggleGoal: (id) => dispatch({ type: "TOGGLE_GOAL", payload: { id } }),
    addTransaction: (input) => dispatch({ type: "ADD_TRANSACTION", payload: input }),
    deleteTransaction: (id) => dispatch({ type: "DELETE_TRANSACTION", payload: { id } }),
    setJournal: (iso, patch) => dispatch({ type: "SET_JOURNAL", payload: { iso, patch } }),
    readNotifications: () => dispatch({ type: "READ_NOTIFICATIONS" }),
    deleteNotification: (id) => dispatch({ type: "DELETE_NOTIFICATION", payload: { id } }),
    clearNotifications: () => dispatch({ type: "CLEAR_NOTIFICATIONS" }),
    spendPoint: (stat) => dispatch({ type: "SPEND_POINT", payload: { stat } }),
    addBonusXp: (amount, title, stat) =>
      dispatch({ type: "BONUS_XP", payload: { amount, title, stat } }),
    dismissXp: (id) => dispatch({ type: "DISMISS_XP", payload: { id } }),
    dismissStatUp: (id) => dispatch({ type: "DISMISS_STAT_UP", payload: { id } }),
    dismissLevelUp: () => dispatch({ type: "DISMISS_LEVEL_UP" }),
    dismissAchievement: () => dispatch({ type: "DISMISS_ACHIEVEMENT" }),
  };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    data: readStored() ?? { ...baseData(), onboarded: false },
    ui: emptyUi,
  }));

  const api = useMemo(() => makeApi(dispatch), []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    } catch {
      /* storage full or unavailable — the app keeps working in memory */
    }
  }, [state.data]);

  const value = useMemo<GameApi>(
    () => ({ ...api, data: state.data, ui: state.ui, hydrated: true }),
    [api, state.data, state.ui],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}

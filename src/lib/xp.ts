import { tr } from "@/i18n";

/* ============================================================
   XP / Level / progression math
   ============================================================ */

/** XP required to move from `level` to `level + 1`. Grows linearly. */
export function xpForLevel(level: number): number {
  return 100 + 100 * Math.max(1, level);
}

/** XP required to move a stat from `level` to `level + 1`. */
export function statXpForLevel(level: number): number {
  return 60 + 40 * Math.max(1, level);
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  xpRemaining: number;
  progress: number;
  nextLevel: number;
}

export function levelInfo(totalXp: number): LevelInfo {
  const safe = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  let level = 1;
  let remaining = safe;
  let need = xpForLevel(level);
  let guard = 0;
  while (remaining >= need && guard < 1000) {
    remaining -= need;
    level += 1;
    need = xpForLevel(level);
    guard += 1;
  }
  return {
    level,
    xpIntoLevel: remaining,
    xpForNext: need,
    xpRemaining: Math.max(0, need - remaining),
    progress: need > 0 ? Math.min(100, (remaining / need) * 100) : 0,
    nextLevel: level + 1,
  };
}

export interface StatLevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number;
  leveledUp: boolean;
}

export function statAddXp(level: number, xp: number, gain: number): StatLevelInfo {
  let lvl = Math.max(1, Math.floor(level || 1));
  let into = Math.max(0, Math.floor(xp || 0));
  const safeGain = Number.isFinite(gain) ? Math.max(0, Math.floor(gain)) : 0;
  into += safeGain;
  let leveledUp = false;
  let guard = 0;
  while (into >= statXpForLevel(lvl) && guard < 500) {
    into -= statXpForLevel(lvl);
    lvl += 1;
    leveledUp = true;
    guard += 1;
  }
  const need = statXpForLevel(lvl);
  return {
    level: lvl,
    xpIntoLevel: into,
    xpForNext: need,
    progress: need > 0 ? Math.min(100, (into / need) * 100) : 0,
    leveledUp,
  };
}

export function statProgress(level: number, xp: number): StatLevelInfo {
  const lvl = Math.max(1, Math.floor(level || 1));
  const into = Math.max(0, Math.floor(xp || 0));
  const need = statXpForLevel(lvl);
  return {
    level: lvl,
    xpIntoLevel: Math.min(into, need),
    xpForNext: need,
    progress: need > 0 ? Math.min(100, (into / need) * 100) : 0,
    leveledUp: false,
  };
}

/* ---------- XP multiplier economy ---------- */

export interface MultiplierBreakdown {
  total: number;
  streakBonus: number;
  levelBonus: number;
  dailyBonus: number;
}

/** Streak bonus ladder — the single source of truth for streak XP bonuses. */
export const STREAK_TIERS: { days: number; bonus: number }[] = [
  { days: 3, bonus: 0.05 },
  { days: 7, bonus: 0.1 },
  { days: 14, bonus: 0.15 },
  { days: 30, bonus: 0.25 },
];

export function streakTierBonus(streak: number): number {
  let bonus = 0;
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.days) bonus = tier.bonus;
  }
  return bonus;
}

export function nextStreakTier(streak: number): { days: number; bonus: number } | null {
  for (const tier of STREAK_TIERS) {
    if (streak < tier.days) return tier;
  }
  return null;
}

/**
 * Understandable bonus economy:
 *  - Streak  3+ days -> +5% XP
 *  - Streak  7+ days -> +10% XP
 *  - Streak 14+ days -> +15% XP
 *  - Streak 30+ days -> +25% XP
 *  - Character level -> +2% per level (capped at +40%)
 *  - First action of the day -> +10% XP
 */
export function xpMultiplier(level: number, streak: number, firstOfDay: boolean): MultiplierBreakdown {
  const streakBonus = streakTierBonus(streak);
  const levelBonus = Math.min(0.4, Math.max(0, level - 1) * 0.02);
  const dailyBonus = firstOfDay ? 0.1 : 0;
  return {
    total: 1 + streakBonus + levelBonus + dailyBonus,
    streakBonus,
    levelBonus,
    dailyBonus,
  };
}

export function applyMultiplier(base: number, m: MultiplierBreakdown): number {
  return Math.max(0, Math.round(base * m.total));
}

/** Rank title for a given level — used across the UI. */
export function rankTitle(level: number): string {
  if (level >= 60) return tr("rank.60");
  if (level >= 40) return tr("rank.40");
  if (level >= 25) return tr("rank.25");
  if (level >= 15) return tr("rank.15");
  if (level >= 8) return tr("rank.8");
  if (level >= 4) return tr("rank.4");
  return tr("rank.1");
}

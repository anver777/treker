/* ============================================================
   LIFE RPG — Domain types
   ============================================================ */

export type StatKey =
  | "strength"
  | "intelligence"
  | "discipline"
  | "career"
  | "finance"
  | "health"
  | "knowledge"
  | "social";

export type QuestCategory = "daily" | "weekly" | "monthly" | "main" | "side";
export type Difficulty = "easy" | "medium" | "hard" | "epic";
export type GoalCategory =
  | "career"
  | "finance"
  | "health"
  | "education"
  | "travel"
  | "business"
  | "lifestyle"
  | "other";

export interface StatState {
  level: number;
  xp: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: Difficulty;
  xp: number;
  stat: StatKey | null;
  deadline: string | null;
  progress: number;
  target: number;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  /** When set, every completion of this habit advances the quest progress. */
  linkedHabitId: string | null;
}

export type HabitFrequency = "daily" | "weekdays" | "weekends" | "custom";
export type HabitStatus = "active" | "paused" | "archived";

/** Habit categories used by the Habit Matrix filters. */
export type HabitCategory =
  | "health"
  | "career"
  | "finance"
  | "learning"
  | "discipline"
  | "social"
  | "other";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  /** Primary stat — kept for backwards compatibility with older saves. */
  stat: StatKey;
  /** Every character stat this habit trains. */
  stats: StatKey[];
  xp: number;
  color: string;
  createdAt: string;
  completions: string[];
  bestStreak: number;
  /** Legacy flag — migrated into `status`. */
  archived: boolean;
  status: HabitStatus;
  description: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  /** 0 = Sunday … 6 = Saturday, only used when frequency === "custom". */
  customDays: number[];
  startDate: string;
  /** Pause window — days inside it are never counted as missed. */
  pausedFrom: string | null;
  pausedUntil: string | null;
  goalId: string | null;
  /** Optional reminder time, HH:MM. */
  reminder: string;
  /** XP actually earned through this habit (kept in sync on complete/uncomplete). */
  totalXpEarned: number;
}

export interface Milestone {
  id: string;
  text: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  deadline: string | null;
  progress: number;
  xp: number;
  stat: StatKey | null;
  milestones: Milestone[];
  createdAt: string;
  completedAt: string | null;
}

export type TransactionType = "income" | "expense";

export type ExpenseCategory =
  | "food"
  | "transport"
  | "housing"
  | "health"
  | "education"
  | "entertainment"
  | "shopping"
  | "smoking"
  | "travel"
  | "subscriptions"
  | "other";

export type IncomeCategory = "salary" | "freelance" | "business" | "gift" | "investment" | "other";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
}

export type ActivityKind =
  | "quest"
  | "habit"
  | "goal"
  | "finance"
  | "level"
  | "achievement"
  | "bonus"
  | "manual";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  xp: number;
  stat: StatKey | null;
  createdAt: string;
  /** Exact stat XP granted per stat — used to reverse an award precisely. */
  statXp?: Partial<Record<StatKey, number>>;
}

export interface AchievementState {
  unlockedAt: string | null;
  seen: boolean;
}

export interface JournalEntry {
  mood: number;
  note: string;
}

export interface Profile {
  name: string;
  avatar: string | null;
  title: string;
  mainGoal: string;
  joinedAt: string;
  totalXp: number;
  characterPoints: number;
  spentPoints: number;
  currency: string;
}

export interface NotificationItem {
  id: string;
  kind: "level" | "streak" | "achievement" | "deadline" | "info";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface Settings {
  theme: "dark" | "light" | "system";
  xpToasts: boolean;
  achievementPopups: boolean;
  levelUpAnimation: boolean;
  sound: boolean;
  reduceMotion: boolean;
  weekStartsMonday: boolean;
  aiEnabled: boolean;
}

export interface AppData {
  version: number;
  onboarded: boolean;
  profile: Profile;
  stats: Record<StatKey, StatState>;
  quests: Quest[];
  habits: Habit[];
  goals: Goal[];
  achievements: Record<string, AchievementState>;
  transactions: Transaction[];
  activity: ActivityEvent[];
  journal: Record<string, JournalEntry>;
  notifications: NotificationItem[];
  settings: Settings;
}

/* ---------- Non-persisted, derived runtime payloads ---------- */

export interface XPGain {
  id: string;
  amount: number;
  stat: StatKey | null;
  label: string;
}

export interface LevelUpPayload {
  from: number;
  to: number;
  characterPoint: number;
  multiplierBonus: number;
}

export interface AchievementUnlock {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
}

export interface NewUserInput {
  name: string;
  avatar: string | null;
  mainGoal: string;
  withDemo: boolean;
}

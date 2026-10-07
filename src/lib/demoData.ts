import type {
  AppData,
  Difficulty,
  Goal,
  GoalCategory,
  Habit,
  HabitCategory,
  HabitFrequency,
  Quest,
  QuestCategory,
  StatKey,
  Transaction,
} from "@/types";
import { STAT_KEYS } from "@/lib/stats";
import { addDays, todayISO, toISO } from "@/lib/date";
import { evaluateAchievements } from "@/lib/achievements";
import { metricsContext } from "@/lib/selectors";
import { getLang } from "@/i18n";
import { habitStatXpSplit } from "@/lib/habitMatrix";

/* ============================================================
   Deterministic demo profile — fully removable by the user
   ============================================================ */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const HISTORY_DAYS = 124;
const START = addDays(todayISO(), -HISTORY_DAYS);

function makeStats(): AppData["stats"] {
  const seed: Record<StatKey, { level: number; xp: number }> = {
    strength: { level: 32, xp: 940 },
    intelligence: { level: 54, xp: 1180 },
    discipline: { level: 48, xp: 742 },
    career: { level: 61, xp: 1360 },
    finance: { level: 37, xp: 610 },
    health: { level: 42, xp: 880 },
    knowledge: { level: 55, xp: 1420 },
    social: { level: 29, xp: 430 },
  };
  const out = {} as AppData["stats"];
  for (const key of STAT_KEYS) out[key] = seed[key];
  return out;
}

interface HabitSeed {
  name: string;
  icon: string;
  stat: StatKey;
  stats: StatKey[];
  color: string;
  xp: number;
  rate: number;
  category: HabitCategory;
  frequency: HabitFrequency;
  customDays?: number[];
  description: string;
  goalId?: string;
  offsetDays?: number;
}

const HABIT_SEEDS: HabitSeed[] = [
  {
    name: "Workout",
    icon: "🏋️",
    stat: "strength",
    stats: ["strength", "health"],
    color: "#fb7185",
    xp: 30,
    rate: 0.91,
    category: "health",
    frequency: "daily",
    description: "Strength training or a run, minimum 40 minutes.",
    goalId: "g3",
  },
  {
    name: "Coding",
    icon: "💻",
    stat: "career",
    stats: ["career", "intelligence"],
    color: "#2fe6a4",
    xp: 35,
    rate: 0.96,
    category: "career",
    frequency: "daily",
    description: "Deep work on real projects and algorithms.",
    goalId: "g1",
  },
  {
    name: "Reading",
    icon: "📚",
    stat: "knowledge",
    stats: ["knowledge", "intelligence"],
    color: "#60a5fa",
    xp: 15,
    rate: 0.88,
    category: "learning",
    frequency: "daily",
    description: "20 pages of a professional or classic book.",
    goalId: "g1",
  },
  {
    name: "English",
    icon: "🗣️",
    stat: "intelligence",
    stats: ["intelligence", "career", "social"],
    color: "#a78bfa",
    xp: 25,
    rate: 0.74,
    category: "learning",
    frequency: "weekdays",
    description: "30 minutes of speaking practice or grammar.",
    goalId: "g1",
  },
  {
    name: "No Smoking",
    icon: "🚭",
    stat: "health",
    stats: ["health", "discipline"],
    color: "#94a3b8",
    xp: 40,
    rate: 0.83,
    category: "health",
    frequency: "daily",
    description: "A clean day with zero cigarettes.",
  },
  {
    name: "Sleep before 00:00",
    icon: "😴",
    stat: "health",
    stats: ["health", "discipline"],
    color: "#4ade80",
    xp: 20,
    rate: 0.79,
    category: "health",
    frequency: "daily",
    description: "Lights out before midnight.",
    goalId: "g3",
  },
  {
    name: "Meditation",
    icon: "🧘",
    stat: "discipline",
    stats: ["discipline", "health"],
    color: "#22d3ee",
    xp: 15,
    rate: 0.62,
    category: "discipline",
    frequency: "daily",
    description: "10 minutes of breathing and focus.",
  },
  {
    name: "Water 2L",
    icon: "💧",
    stat: "health",
    stats: ["health"],
    color: "#38bdf8",
    xp: 10,
    rate: 0.86,
    category: "health",
    frequency: "daily",
    description: "Two litres of water through the day.",
    goalId: "g3",
  },
  {
    name: "Walking 8000 steps",
    icon: "🚶",
    stat: "health",
    stats: ["health"],
    color: "#f7b955",
    xp: 15,
    rate: 0.7,
    category: "health",
    frequency: "daily",
    description: "Walk instead of short rides.",
    goalId: "g3",
  },
  {
    name: "Social Media Limit",
    icon: "📵",
    stat: "discipline",
    stats: ["discipline"],
    color: "#f472b6",
    xp: 20,
    rate: 0.42,
    category: "discipline",
    frequency: "daily",
    description: "Less than 30 minutes of scrolling.",
    offsetDays: 60,
  },
  {
    name: "No Impulse Buying",
    icon: "💰",
    stat: "finance",
    stats: ["finance", "discipline"],
    color: "#2fe6a4",
    xp: 25,
    rate: 0.68,
    category: "finance",
    frequency: "weekdays",
    description: "Only planned purchases today.",
    goalId: "g2",
    offsetDays: 90,
  },
  {
    name: "Family Time",
    icon: "👨‍👩‍👧",
    stat: "social",
    stats: ["social"],
    color: "#f472b6",
    xp: 20,
    rate: 0.66,
    category: "social",
    frequency: "weekends",
    description: "A real conversation, no phone.",
    offsetDays: 110,
  },
];

function makeHabits(): Habit[] {
  const rand = mulberry32(20260901);
  const today = todayISO();
  return HABIT_SEEDS.map((seed, idx) => {
    const completions: string[] = [];
    const start = addDays(START, idx * 2 + (seed.offsetDays ? 0 : 0));
    const startISO = seed.offsetDays ? addDays(today, -seed.offsetDays) : start;
    const total = Math.abs(Math.round((fromISOKey(today).getTime() - fromISOKey(startISO).getTime()) / 86400000));
    for (let i = 0; i <= total; i++) {
      const iso = addDays(startISO, i);
      if (iso > today) break;
      if (!isPlannedDay(seed.frequency, seed.customDays, iso)) continue;
      const weekend = [0, 6].includes(new Date(iso).getDay());
      const p = seed.rate * (weekend ? 0.85 : 1) * (i < 3 ? 0.6 : 1);
      if (rand() < p) completions.push(iso);
    }
    let best = 1;
    let run = 1;
    for (let i = 1; i < completions.length; i++) {
      const gap = Math.round(
        (new Date(completions[i]).getTime() - new Date(completions[i - 1]).getTime()) / 86400000,
      );
      run = gap === 1 ? run + 1 : 1;
      if (run > best) best = run;
    }
    const xpEarned = completions.reduce((sum, iso) => {
      const streakAt = streakUpTo(completions, iso);
      const bonus = streakAt >= 30 ? 0.25 : streakAt >= 14 ? 0.15 : streakAt >= 7 ? 0.1 : streakAt >= 3 ? 0.05 : 0;
      return sum + Math.round(seed.xp * (1 + bonus));
    }, 0);
    return {
      id: `habit_${idx + 1}`,
      name: loc(seed.name),
      icon: seed.icon,
      stat: seed.stat,
      stats: seed.stats,
      xp: seed.xp,
      color: seed.color,
      createdAt: new Date(startISO).toISOString(),
      completions,
      bestStreak: best,
      archived: false,
      status: "active",
      description: loc(seed.description),
      category: seed.category,
      frequency: seed.frequency,
      customDays: seed.customDays ?? [],
      startDate: startISO,
      pausedFrom: null,
      pausedUntil: null,
      goalId: seed.goalId ?? null,
      reminder: "",
      totalXpEarned: xpEarned,
    };
  });
}

function isPlannedDay(freq: HabitFrequency, custom: number[] | undefined, iso: string): boolean {
  const dow = new Date(iso).getDay();
  if (freq === "weekdays") return dow >= 1 && dow <= 5;
  if (freq === "weekends") return dow === 0 || dow === 6;
  if (freq === "custom") return (custom ?? []).includes(dow);
  return true;
}

function streakUpTo(completions: string[], iso: string): number {
  const set = new Set(completions);
  let cursor = iso;
  let n = 0;
  while (set.has(cursor) && n < 1000) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

function fromISOKey(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

function makeQuests(): Quest[] {
  const mk = (
    id: string,
    title: string,
    description: string,
    category: QuestCategory,
    difficulty: Difficulty,
    xp: number,
    stat: StatKey | null,
    progress: number,
    target: number,
    deadlineOffset: number | null,
    completed = false,
    completedDaysAgo = 0,
    linkedHabitId: string | null = null,
  ): Quest => ({
    id,
    title,
    description,
    category,
    difficulty,
    xp,
    stat,
    deadline: deadlineOffset === null ? null : addDays(todayISO(), deadlineOffset),
    progress,
    target,
    completed,
    completedAt: completed
      ? new Date(`${addDays(todayISO(), -completedDaysAgo)}T${`${9 + (completedDaysAgo % 10)}`.padStart(2, "0")}:${`${(completedDaysAgo * 11) % 60}`.padStart(2, "0")}:00`).toISOString()
      : null,
    linkedHabitId,
    createdAt: new Date(addDays(todayISO(), -12)).toISOString(),
  });

  return [
    mk("q1", "Morning workout", "45 minutes of training before 10:00", "daily", "easy", 30, "strength", 0, 1, 0),
    mk("q2", "Read 20 pages", "Non-fiction or professional literature", "daily", "easy", 20, "knowledge", 0, 1, 0),
    mk("q3", "Study programming", "Deep focus session, minimum 1 hour", "daily", "medium", 50, "knowledge", 0, 1, 0),
    mk("q4", "No smoking today", "Keep the lungs clean all day", "daily", "medium", 40, "health", 0, 1, 0),
    mk("q5", "Sleep before 00:00", "Lights out before midnight", "daily", "easy", 20, "health", 0, 1, 0),
    mk(
      "q6",
      "Complete 5 workouts",
      "Five training sessions this week",
      "weekly",
      "hard",
      150,
      "strength",
      3,
      5,
      2,
      false,
      0,
      "habit_1",
    ),
    mk(
      "q7",
      "Study 5 days",
      "Five focused study days this week",
      "weekly",
      "hard",
      200,
      "knowledge",
      2,
      5,
      3,
      false,
      0,
      "habit_2",
    ),
    mk("q8", "Save 10,000 ₽", "Transfer to savings account", "weekly", "epic", 250, "finance", 0, 1, 4),
    mk("q9", "Ship portfolio website", "Deploy the personal site with 3 projects", "side", "hard", 400, "career", 65, 100, 21),
    mk(
      "q10",
      "Become Mid-Level Frontend Developer",
      "Master React, TypeScript, testing and system design to qualify for a mid-level role.",
      "main",
      "epic",
      1000,
      "career",
      47,
      100,
      90,
    ),
    mk("q11", "Inbox zero", "Clear all email and messages", "side", "easy", 30, "discipline", 1, 1, null, true, 3),
    mk("q12", "Weekly review", "Review goals, habits and finances", "weekly", "medium", 80, "discipline", 1, 1, null, true, 2),
    mk("q13", "Morning workout", "45 minutes of training before 10:00", "daily", "easy", 30, "strength", 1, 1, null, true, 1),
    mk("q14", "Read 20 pages", "Non-fiction or professional literature", "daily", "easy", 20, "knowledge", 1, 1, null, true, 1),
    mk("q15", "Study programming", "Deep focus session, minimum 1 hour", "daily", "medium", 50, "knowledge", 1, 1, null, true, 4),
    mk("q16", "No smoking today", "Keep the lungs clean all day", "daily", "medium", 40, "health", 1, 1, null, true, 5),
    mk("q17", "Deploy landing page", "Ship the side project landing", "side", "medium", 120, "career", 1, 1, null, true, 6),
    mk("q18", "Refactor old component", "Clean up the dashboard code", "side", "medium", 90, "career", 1, 1, null, true, 8),
    mk("q19", "Cook at home", "No delivery today", "daily", "easy", 25, "health", 1, 1, null, true, 7),
    mk("q20", "Call parents", "Ten minutes, no distractions", "side", "easy", 35, "social", 1, 1, null, true, 9),
  ];
}

function makeGoals(): Goal[] {
  const base = (id: string, title: string, description: string, category: GoalCategory, progress: number, xp: number, stat: StatKey, milestoneTexts: string[], doneCount: number): Goal => ({
    id,
    title,
    description,
    category,
    deadline: addDays(todayISO(), 200),
    progress,
    xp,
    stat,
    milestones: milestoneTexts.map((text, i) => ({
      id: `${id}_m${i + 1}`,
      text,
      done: i < doneCount,
    })),
    createdAt: new Date(START).toISOString(),
    completedAt: null,
  });

  return [
    base(
      "g1",
      "Become Mid-Level Developer",
      "Grow from junior to mid-level frontend engineer with a strong portfolio.",
      "career",
      47,
      1000,
      "career",
      ["HTML & CSS", "JavaScript", "React", "TypeScript", "Next.js", "Testing", "First paid project"],
      4,
    ),
    base(
      "g2",
      "Save 500,000 ₽",
      "Build a financial safety cushion for independence.",
      "finance",
      38,
      1200,
      "finance",
      ["Open savings account", "Save 100,000 ₽", "Save 250,000 ₽", "Save 500,000 ₽"],
      2,
    ),
    base(
      "g3",
      "Run 10 km without stopping",
      "Reach solid endurance and a healthy heart.",
      "health",
      62,
      600,
      "health",
      ["Run 3 km", "Run 5 km", "Run 7 km", "Run 10 km"],
      2,
    ),
    base(
      "g4",
      "Travel to another country",
      "One international trip per year, fully self-funded.",
      "travel",
      20,
      500,
      "social",
      ["Choose destination", "Save budget", "Book tickets", "Go"],
      1,
    ),
    base(
      "g5",
      "Build my own business",
      "Launch a small product that generates recurring income.",
      "business",
      15,
      1500,
      "career",
      ["Validate idea", "Build MVP", "First 10 users", "First revenue"],
      1,
    ),
  ];
}

function makeTransactions(): Transaction[] {
  const rand = mulberry32(777);
  const out: Transaction[] = [];
  const now = new Date();
  for (let back = 2; back >= 0; back--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const limit = back === 0 ? now.getDate() : daysInMonth;
    out.push({
      id: uid("tx"),
      type: "income",
      amount: 100000,
      category: "salary",
      note: "Monthly salary",
      date: toISO(new Date(year, month, Math.min(5, limit))),
    });
    if (rand() > 0.25) {
      out.push({
        id: uid("tx"),
        type: "income",
        amount: Math.round(8000 + rand() * 24000),
        category: "freelance",
        note: "Freelance project",
        date: toISO(new Date(year, month, Math.min(18, limit))),
      });
    }
    const plans: { category: string; note: string; amount: number; day: number; chance: number }[] = [
      { category: "housing", note: "Rent", amount: 32000, day: 3, chance: 1 },
      { category: "food", note: "Groceries", amount: 4200, day: 6, chance: 1 },
      { category: "food", note: "Groceries", amount: 4600, day: 14, chance: 1 },
      { category: "food", note: "Groceries", amount: 3900, day: 23, chance: 1 },
      { category: "transport", note: "Transport card", amount: 2200, day: 4, chance: 1 },
      { category: "subscriptions", note: "Services & tools", amount: 1900, day: 8, chance: 1 },
      { category: "entertainment", note: "Cinema & games", amount: 2600, day: 11, chance: 0.7 },
      { category: "shopping", note: "Clothes", amount: 6500, day: 17, chance: 0.5 },
      { category: "health", note: "Gym membership", amount: 3000, day: 2, chance: 1 },
      { category: "smoking", note: "Cigarettes", amount: 1400, day: 9, chance: 0.4 },
      { category: "education", note: "Courses & books", amount: 3800, day: 20, chance: 0.8 },
    ];
    for (const p of plans) {
      if (rand() > p.chance) continue;
      if (p.day > limit) continue;
      out.push({
        id: uid("tx"),
        type: "expense",
        amount: p.amount,
        category: p.category,
        note: p.note,
        date: toISO(new Date(year, month, p.day)),
      });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function makeActivity(habits: Habit[], quests: Quest[]): AppData["activity"] {
  const out: AppData["activity"] = [];
  // Cover the whole demo history so analytics and the heatmap have real data.
  for (const h of habits) {
    for (const iso of h.completions) {
      const streakAt = streakUpTo(h.completions, iso);
      const bonus =
        streakAt >= 30 ? 0.25 : streakAt >= 14 ? 0.15 : streakAt >= 7 ? 0.1 : streakAt >= 3 ? 0.05 : 0;
      const amount = Math.round(h.xp * (1 + bonus));
      out.push({
        id: uid("act"),
        kind: "habit",
        title: h.name,
        detail: bonus > 0 ? `+${Math.round(bonus * 100)}% ${"streak bonus"}` : "Habit completed",
        xp: amount,
        stat: h.stat,
        statXp: habitStatXpSplit(h, amount),
        createdAt: new Date(`${iso}T${`${8 + (h.name.length % 11)}`.padStart(2, "0")}:${`${(iso.charCodeAt(8) * 7) % 60}`.padStart(2, "0")}:00`).toISOString(),
      });
    }
  }
  for (const q of quests) {
    if (!q.completedAt) continue;
    const iso = q.completedAt.slice(0, 10);
    out.push({
      id: uid("act"),
      kind: "quest",
      title: q.title,
      detail: "Quest completed",
      xp: q.xp,
      stat: q.stat,
      createdAt: new Date(`${iso}T20:00:00`).toISOString(),
    });
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 1450);
}

function makeJournal(): AppData["journal"] {
  const rand = mulberry32(4242);
  const out: AppData["journal"] = {};
  for (let i = 13; i >= 0; i--) {
    const iso = addDays(todayISO(), -i);
    out[iso] = {
      mood: Math.max(3, Math.min(10, Math.round(6 + rand() * 3.4))),
      note: "",
    };
  }
  return out;
}

export 
/* ============================================================
   Demo content localization — generated in the active language
   ============================================================ */

const DEMO_TEXT: Record<string, string> = {
  // habits
  Workout: "Тренировка",
  Coding: "Программирование",
  Reading: "Чтение",
  English: "Английский",
  "No Smoking": "Без сигарет",
  "Sleep before 00:00": "Сон до 00:00",
  Meditation: "Медитация",
  "Water 2L": "Вода 2 л",
  "Walking 8000 steps": "Ходьба 8000 шагов",
  // quests
  "Morning workout": "Утренняя тренировка",
  "Read 20 pages": "Прочитать 20 страниц",
  "Study programming": "Изучение программирования",
  "No smoking today": "Сегодня без сигарет",
  "Sleep before 00:00 ": "Сон до 00:00",
  "Complete 5 workouts": "5 тренировок за неделю",
  "Study 5 days": "5 дней учёбы",
  "Save 10,000 ₽": "Отложить 10 000 ₽",
  "Ship portfolio website": "Запустить портфолио",
  "Become Mid-Level Frontend Developer": "Стать middle-фронтенд-разработчиком",
  "Inbox zero": "Нулевой инбокс",
  "Weekly review": "Недельный обзор",
  "Deploy landing page": "Задеплоить лендинг",
  "Refactor old component": "Отрефакторить компонент",
  "Cook at home": "Готовить дома",
  "Call parents": "Позвонить родителям",
  // goals
  "Become Mid-Level Developer": "Стать middle-разработчиком",
  "Save 500,000 ₽": "Накопить 500 000 ₽",
  "Run 10 km without stopping": "Пробежать 10 км без остановки",
  "Travel to another country": "Поехать в другую страну",
  "Build my own business": "Построить своё дело",
  // milestones
  "HTML & CSS": "HTML и CSS",
  JavaScript: "JavaScript",
  React: "React",
  TypeScript: "TypeScript",
  "Next.js": "Next.js",
  Testing: "Тесты",
  "First paid project": "Первый платный проект",
  "Open savings account": "Открыть накопительный счёт",
  "Save 100,000 ₽": "Отложить 100 000 ₽",
  "Save 250,000 ₽": "Отложить 250 000 ₽",
  "Save 500,000 ₽ ": "Накопить 500 000 ₽",
  "Run 3 km": "Пробежать 3 км",
  "Run 5 km": "Пробежать 5 км",
  "Run 7 km": "Пробежать 7 км",
  "Run 10 km": "Пробежать 10 км",
  "Choose destination": "Выбрать направление",
  "Save budget": "Накопить бюджет",
  "Book tickets": "Купить билеты",
  Go: "Поехать",
  "Validate idea": "Проверить идею",
  "Build MVP": "Собрать MVP",
  "First 10 users": "Первые 10 пользователей",
  "First revenue": "Первый доход",
  // finance notes / categories shown in UI
  "Monthly salary": "Зарплата",
  "Freelance project": "Фриланс-проект",
  Rent: "Аренда",
  Groceries: "Продукты",
  "Transport card": "Транспорт",
  "Services & tools": "Сервисы и инструменты",
  "Cinema & games": "Кино и игры",
  Clothes: "Одежда",
  "Gym membership": "Спортзал",
  Cigarettes: "Сигареты",
  "Courses & books": "Курсы и книги",
};

const DEMO_DESC: Record<string, string> = {
  "45 minutes of training before 10:00": "45 минут тренировки до 10:00",
  "Non-fiction or professional literature": "Нон-фикшн или профессиональная литература",
  "Deep focus session, minimum 1 hour": "Глубокая фокус-сессия минимум 1 час",
  "Keep the lungs clean all day": "Весь день без сигарет",
  "Lights out before midnight": "Отбой до полуночи",
  "Five training sessions this week": "Пять тренировок на этой неделе",
  "Five focused study days this week": "Пять дней учёбы на этой неделе",
  "Transfer to savings account": "Перевод на накопительный счёт",
  "Deploy the personal site with 3 projects": "Запустить личный сайт с 3 проектами",
  "Master React, TypeScript, testing and system design to qualify for a mid-level role.":
    "Освоить React, TypeScript, тестирование и системный дизайн, чтобы претендовать на middle-позицию.",
  "Clear all email and messages": "Разобрать все письма и сообщения",
  "Review goals, habits and finances": "Проверить цели, привычки и финансы",
  "Ship the side project landing": "Выложить лендинг сайд-проекта",
  "Clean up the dashboard code": "Прибрать код дашборда",
  "No delivery today": "Сегодня без доставки",
  "Ten minutes, no distractions": "Десять минут без отвлечений",
  "Grow from junior to mid-level frontend engineer with a strong portfolio.":
    "Вырасти из джуна в middle-фронтенда с сильным портфолио.",
  "Build a financial safety cushion for independence.":
    "Сформировать финансовую подушку для независимости.",
  "Reach solid endurance and a healthy heart.": "Выйти на хорошую выносливость и здоровое сердце.",
  "One international trip per year, fully self-funded.":
    "Одна заграничная поездка в год, полностью за свои.",
  "Launch a small product that generates recurring income.":
    "Запустить небольшой продукт с повторяющимся доходом.",
};

function loc(text: string): string {
  if (getLang() !== "ru") return text;
  return DEMO_TEXT[text] ?? DEMO_DESC[text] ?? text;
}

function localizeHabits(list: Habit[]): Habit[] {
  if (getLang() !== "ru") return list;
  return list.map((h) => ({ ...h, name: loc(h.name) }));
}

function localizeQuests(list: Quest[]): Quest[] {
  if (getLang() !== "ru") return list;
  return list.map((q) => ({ ...q, title: loc(q.title), description: loc(q.description) }));
}

function localizeGoals(list: Goal[]): Goal[] {
  if (getLang() !== "ru") return list;
  return list.map((g) => ({
    ...g,
    title: loc(g.title),
    description: loc(g.description),
    milestones: g.milestones.map((m) => ({ ...m, text: loc(m.text) })),
  }));
}

function localizeTx(list: Transaction[]): Transaction[] {
  if (getLang() !== "ru") return list;
  return list.map((t) => ({ ...t, note: loc(t.note) }));
}

export function createDemoData(): AppData {
  const habits = localizeHabits(makeHabits());
  const quests = localizeQuests(makeQuests());
  const data: AppData = {
    version: 1,
    onboarded: true,
    profile: {
      name: "Anver",
      avatar: null,
      title: "Disciplined",
      mainGoal: loc("Become Mid-Level Frontend Developer"),
      joinedAt: new Date(START).toISOString(),
      totalXp: 2450,
      characterPoints: 3,
      spentPoints: 0,
      currency: "₽",
    },
    stats: makeStats(),
    quests,
    habits,
    goals: localizeGoals(makeGoals()),
    achievements: {},
    transactions: localizeTx(makeTransactions()),
    activity: makeActivity(habits, quests),
    journal: makeJournal(),
    notifications: [
      {
        id: uid("n"),
        kind: "streak",
        title: "🔥 Streak!",
        body: loc("Coding") + " — 12 дней подряд.",
        createdAt: new Date().toISOString(),
        read: false,
      },
      {
        id: uid("n"),
        kind: "deadline",
        title: "⚠ Quest deadline",
        body: "Недельный квест «" + loc("Complete 5 workouts") + "» скоро закончится.",
        createdAt: new Date().toISOString(),
        read: false,
      },
    ],
    settings: {
      theme: "dark",
      xpToasts: true,
      achievementPopups: true,
      levelUpAnimation: true,
      sound: false,
      reduceMotion: false,
      weekStartsMonday: true,
      aiEnabled: true,
    },
  };
  // Pre-unlock everything the demo data already satisfies (no popups on first load)
  const metrics = metricsContext(data);
  const unlocked = evaluateAchievements(data, metrics);
  const now = new Date().toISOString();
  for (const id of unlocked) {
    data.achievements[id] = { unlockedAt: now, seen: true };
  }
  return data;
}

export function createEmptyData(name: string, avatar: string | null, mainGoal: string): AppData {
  const stats = {} as AppData["stats"];
  for (const key of STAT_KEYS) stats[key] = { level: 1, xp: 0 };
  return {
    version: 1,
    onboarded: true,
    profile: {
      name: name.trim() || "Player",
      avatar,
      title: "Novice",
      mainGoal: mainGoal.trim(),
      joinedAt: new Date().toISOString(),
      totalXp: 0,
      characterPoints: 0,
      spentPoints: 0,
      currency: "₽",
    },
    stats,
    quests: [],
    habits: [],
    goals: [],
    achievements: {},
    transactions: [],
    activity: [],
    journal: {},
    notifications: [
      {
        id: uid("n"),
        kind: "info",
        title: "Welcome to LIFE RPG",
        body: "Create your first habit and start earning XP.",
        createdAt: new Date().toISOString(),
        read: false,
      },
    ],
    settings: {
      theme: "dark",
      xpToasts: true,
      achievementPopups: true,
      levelUpAnimation: true,
      sound: false,
      reduceMotion: false,
      weekStartsMonday: true,
      aiEnabled: true,
    },
  };
}

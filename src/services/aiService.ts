import type { AppData } from "@/types";
import {
  daySummary,
  financeSummary,
  goalStats,
  habitsOverview,
  lifeScore,
  metricsContext,
  questStats,
  topHabits,
  xpByDay,
} from "@/lib/selectors";
import { STATS } from "@/lib/stats";
import { ACHIEVEMENTS, unlockedCount } from "@/lib/achievements";
import { levelInfo, rankTitle } from "@/lib/xp";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { addDays, monthKey, monthLabel, todayISO } from "@/lib/date";
import { getLang, tr } from "@/i18n";
import {
  missRateByWeekday,
  monthComparison,
  mostMissed,
  streakDashboard,
  topConsistent,
} from "@/lib/habitMatrix";
import { habitWindowStats, habitsPlannedOn } from "@/lib/habitPlan";
import { streakTierBonus, nextStreakTier } from "@/lib/xp";

/* ============================================================
   AI Coach service layer
   ------------------------------------------------------------
   Two modes:
   1. "api"   — a real LLM enabled through environment variables
                (VITE_AI_API_KEY / VITE_AI_API_URL / VITE_AI_MODEL).
   2. "local" — a deterministic on-device analyst that answers from
                the player's own data. Always available, and the UI
                labels it clearly so nothing pretends to be an LLM.
   ============================================================ */

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

export const AI_CONFIG = {
  apiKey: env.VITE_AI_API_KEY || "",
  apiUrl: env.VITE_AI_API_URL || "https://api.openai.com/v1/chat/completions",
  model: env.VITE_AI_MODEL || "gpt-4o-mini",
};

export type AISource = "api" | "local";

export interface ChatMessage {
  id: string;
  role: "user" | "coach";
  text: string;
  createdAt: string;
  source?: AISource;
}

export function isAIConfigured(): boolean {
  return Boolean(AI_CONFIG.apiKey);
}

/** Quick prompts are stored as i18n keys so they follow the interface language. */
const PROMPT_KEYS = [
  "ai.q.week",
  "ai.q.today",
  "ai.q.missedMost",
  "ai.q.matrixBest",
  "ai.q.weak",
  "ai.q.progress",
  "ai.q.finance",
  "ai.q.habits",
];

export function promptTexts(): string[] {
  return PROMPT_KEYS.map((k) => tr(k));
}

/** Pick a string in the active interface language. */
function L(ru: string, en: string): string {
  return getLang() === "ru" ? ru : en;
}

function safeHabitXp(h: { totalXpEarned?: number }): number {
  const n = Number(h.totalXpEarned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export const QUICK_PROMPTS = promptTexts();

/* ---------- Context snapshot handed to the model ---------- */

export function buildContext(data: AppData): Record<string, unknown> {
  const today = todayISO();
  const m = metricsContext(data, today);
  const week = xpByDay(data.activity, 7, today);
  const lvl = levelInfo(data.profile.totalXp);
  return {
    interfaceLanguage: getLang() === "ru" ? "Russian" : "English",
    playerName: data.profile.name,
    level: lvl.level,
    rank: rankTitle(lvl.level),
    totalXp: data.profile.totalXp,
    lifeScore: lifeScore(data, today).score,
    stats: Object.fromEntries(
      (Object.keys(m.statLevels) as (keyof typeof m.statLevels)[]).map((k) => [
        STATS[k].label,
        m.statLevels[k],
      ]),
    ),
    strongestStat: STATS[m.strongestStat].label,
    weakestStat: STATS[m.weakestStat].label,
    habits: {
      count: data.habits.length,
      completionRate: formatPercent(habitsOverview(data.habits, today).rate),
      currentStreak: m.currentStreak,
      bestStreak: m.bestStreak,
      top: m.topHabits.map((t) => ({ name: t.habit.name, rate: formatPercent(t.rate) })),
      weakest: m.worstHabits.map((t) => ({ name: t.habit.name, rate: formatPercent(t.rate) })),
    },
    quests: {
      total: questStats(data.quests, today).total,
      completed: m.questsCompleted,
      active: questStats(data.quests, today).active,
      overdue: questStats(data.quests, today).overdue,
    },
    goals: data.goals.map((g) => ({
      title: g.title,
      progress: g.progress,
      done: Boolean(g.completedAt),
      milestonesDone: g.milestones.filter((x) => x.done).length,
      milestonesTotal: g.milestones.length,
    })),
    finance: (() => {
      const s = financeSummary(data.transactions, monthKey(today));
      return {
        month: monthLabel(today),
        income: s.income,
        expenses: s.expense,
        saved: s.balance,
        topSpending: s.byCategory.slice(0, 4).map((c) => ({ category: c.key, value: c.value })),
        currency: data.profile.currency,
      };
    })(),
    xpLast7Days: week.reduce((sum, d) => sum + d.value, 0),
    achievementsUnlocked: `${unlockedCount(data)} / ${ACHIEVEMENTS.length}`,
    today: daySummary(data, today),
  };
}

const SYSTEM_PROMPT = `You are the LIFE RPG Coach. You motivate the player by analysing their real
life data: quests, habits, goals, XP, stats and finances.
Rules: be concise (max 130 words), concrete, use the numbers you are given,
never invent data, always end with one clear next action, and always answer in
the player's interface language.
Tone: calm, premium, supportive — never aggressive.`;

/* ---------- Public API ---------- */

export async function askCoach(options: {
  question: string;
  data: AppData;
  history: ChatMessage[];
}): Promise<{ text: string; source: AISource }> {
  const { question, data, history } = options;
  if (!isAIConfigured()) {
    return { text: localAnswer(question, data), source: "local" };
  }
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    const res = await fetch(AI_CONFIG.apiUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        temperature: 0.5,
        max_tokens: 320,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "system",
            content: `Player data snapshot (JSON): ${JSON.stringify(buildContext(data))}`,
          },
          ...history.slice(-8).map((m) => ({ role: m.role, content: m.text })),
          { role: "user", content: question },
        ],
      }),
    });
    window.clearTimeout(timeout);
    if (!res.ok) throw new Error(`AI request failed (${res.status})`);
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty AI response");
    return { text, source: "api" };
  } catch {
    return {
      text: `${localAnswer(question, data)}\n\n_${L(
        "Не удалось связаться с живой моделью — ответ подготовлен локальным аналитиком.",
        "Live AI connection failed — this answer came from the on-device analyst.",
      )}_`,
      source: "local",
    };
  }
}

/* ---------- On-device analyst ---------- */

/** Russian keywords are mapped onto English keywords so one matcher serves both languages. */
const RU_HINTS: [RegExp, string][] = [
  [/недел|7 дн|семь дн/, "week"],
  [/сегодн|что делать|мне делать/, "today"],
  [/привыч/, "habit"],
  [/самая стабильн|стабильная/, "matrixBest"],
  [/пропуска|чаще всего пропуск/, "missedMost"],
  [/какой у меня сейчас|текущ(ий|ая) streak|серия сейчас/, "streakNow"],
  [/лучший streak|рекорд streak|лучшей серии/, "bestStreak"],
  [/день недел|по дням недели|будн|выходн/, "weekdayMiss"],
  [/изменил|прогресс за месяц|сравн/, "monthChange"],
  [/карьер|прокачив.*карьер/, "careerHabits"],
  [/благодаря привыч|сколько xp.*привыч/, "habitXp"],
  [/финанс|деньг|денег|трат|расход|покупа/, "money"],
  [/заработ|доход|зарплат|получил за мес/, "income"],
  [/цель|цели|целям/, "goal"],
  [/сери|серию|подряд/, "streak"],
  [/уровен|левел/, "level"],
  [/достижен|трофе|наград/, "achievement"],
  [/прогрес|снизил|упал|хуже/, "progress"],
  [/слаб|слабые|улучш|не хватает/, "weak"],
  [/пропуск|пропуска|забыва|чаще всего/, "miss"],
  [/сильн|лучшая характеристика|самая сильная/, "strong"],
];

export function localAnswer(question: string, data: AppData): string {
  let q = (question || "").toLowerCase();
  for (const [re, en] of RU_HINTS) {
    if (re.test(q)) q += ` ${en}`;
  }

  const today = todayISO();
  const m = metricsContext(data, today);
  const lvl = levelInfo(data.profile.totalXp);
  const overview = habitsOverview(data.habits, today);
  const qs = questStats(data.quests, today);
  const cur = data.profile.currency;
  const has = (...keys: string[]) => keys.some((k) => q.includes(k));
  const active = data.habits.filter((h) => h.status !== "archived");

  if (has("xp") && (has("week", "7 day", "seven") || has("earn"))) {
    const week = xpByDay(data.activity, 7, today);
    const total = week.reduce((s, d) => s + d.value, 0);
    const best = week.reduce((a, b) => (b.value > a.value ? b : a), week[0]);
    return L(
      `За последние 7 дней вы получили **${formatNumber(total)} XP**${
        best ? `, лучший день — ${best.label} с ${formatNumber(best.value)} XP` : ""
      }. До уровня ${lvl.nextLevel} осталось ${formatNumber(lvl.xpRemaining)} XP. Держите серию — с 7 дней подряд растёт множитель XP.`,
      `You earned **${formatNumber(total)} XP** in the last 7 days${
        best ? `, peaking with ${formatNumber(best.value)} XP on ${best.label}` : ""
      }. You are ${formatNumber(lvl.xpRemaining)} XP from level ${lvl.nextLevel}. Keep the streak alive — the XP multiplier grows with every 7 days.`,
    );
  }

  if (has("miss", "skip", "worst habit", "weak habit")) {
    const weakest = m.worstHabits.filter((w) => !w.habit.archived);
    if (weakest.length === 0) {
      return L(
        "Привычек пока нет, поэтому пропускать нечего. Создайте первую привычку — и я начну следить за регулярностью.",
        "You have no habits tracked yet, so there is nothing to miss. Create your first habit and I will start monitoring consistency.",
      );
    }
    const lines = weakest
      .slice(0, 3)
      .map((w) => `• ${w.habit.name} — ${formatPercent(w.rate)} ${L("за 30 дней", "in the last 30 days")}`)
      .join("\n");
    return L(
      `Эти привычки проседают сильнее всего:\n${lines}\n\nСледующий шаг: возьмите самую слабую и поставьте её сразу после действия, которое вы уже делаете каждый день.`,
      `These habits are slipping the most:\n${lines}\n\nNext action: pick the weakest one and schedule it right after something you already do every day.`,
    );
  }

  if (has("drop", "decrease", "down", "why is my progress", "slower", "worse")) {
    const last7 = xpByDay(data.activity, 7, today).reduce((s, d) => s + d.value, 0);
    const prev7 = xpByDay(data.activity, 14, today)
      .slice(0, 7)
      .reduce((s, d) => s + d.value, 0);
    const delta = prev7 === 0 ? 0 : Math.round(((last7 - prev7) / prev7) * 100);
    const missed = data.habits.filter((h) => !h.completions.includes(today) && !h.archived).length;
    return L(
      `Ваш XP изменился на **${delta >= 0 ? "+" : ""}${delta}%** по сравнению с предыдущей неделей (${formatNumber(
        last7,
      )} против ${formatNumber(prev7)}). Сегодня открыто ${missed} из ${data.habits.length} привычек и ${
        qs.active
      } активных квестов. Прогресс замедляется, когда квесты копятся — следующий шаг: закройте один просроченный квест сегодня.`,
      `Your XP changed **${delta >= 0 ? "+" : ""}${delta}%** versus the previous week (${formatNumber(
        last7,
      )} vs ${formatNumber(prev7)}). Today ${missed} of ${data.habits.length} habits are still open and ${
        qs.active
      } quests are active. Progress slows when quests pile up — next action: clear one overdue quest today.`,
    );
  }

  if (has("income", "salary", "made") && has("month", "last month", "previous")) {
    const prev = monthKey(addDays(today, -30));
    const s = financeSummary(data.transactions, prev);
    return L(
      `В ${monthLabel(addDays(today, -30))} вы записали доход ${formatCurrency(s.income, cur)} и расходы ${formatCurrency(
        s.expense,
        cur,
      )}, отложив ${formatCurrency(s.balance, cur)} (норма сбережений ${formatPercent(s.savingsRate, 0)}).`,
      `In ${monthLabel(addDays(today, -30))} you logged ${formatCurrency(s.income, cur)} income and ${formatCurrency(
        s.expense,
        cur,
      )} expenses, saving ${formatCurrency(s.balance, cur)} (${formatPercent(s.savingsRate, 0)} savings rate).`,
    );
  }

  if (has("spend", "expense", "money go", "biggest", "most expensive", "money")) {
    const s = financeSummary(data.transactions, monthKey(today));
    if (s.byCategory.length === 0) {
      return L(
        "В этом месяце расходов нет. Добавьте операции в разделе «Финансы» — и я покажу, куда уходят деньги.",
        "No expenses logged this month. Add your transactions in Finance and I will break down where the money goes.",
      );
    }
    const lines = s.byCategory
      .slice(0, 3)
      .map((c) => `• ${c.key} — ${formatCurrency(c.value, cur)} (${formatPercent(c.share, 0)})`)
      .join("\n");
    return L(
      `Больше всего расходов в этом месяце:\n${lines}\n\nИтого расходы ${formatCurrency(
        s.expense,
        cur,
      )} при доходе ${formatCurrency(s.income, cur)}. Следующий шаг: задайте недельный лимит по самой крупной категории.`,
      `Your biggest spending this month:\n${lines}\n\nTotal expenses ${formatCurrency(
        s.expense,
        cur,
      )} of ${formatCurrency(s.income, cur)} income. Next action: set a weekly cap for the top category.`,
    );
  }

  if (has("strong", "best stat", "powerful")) {
    return L(
      `Ваша сильнейшая характеристика — **${STATS[m.strongestStat].label}** ${
        m.statLevels[m.strongestStat]
      } уровня. Слабейшая — ${STATS[m.weakestStat].label} на уровне ${
        m.statLevels[m.weakestStat]
      }: именно туда следующее очко персонажа даст больше всего баланса.`,
      `Your strongest characteristic is **${STATS[m.strongestStat].label}** at level ${
        m.statLevels[m.strongestStat]
      }. The weakest is ${STATS[m.weakestStat].label} at level ${m.statLevels[m.weakestStat]} — that is where the next character point would create the most balance.`,
    );
  }

  if (has("weak", "improve", "lack")) {
    const weak = m.worstHabits[0];
    return L(
      `Слабые места сейчас:\n• ${STATS[m.weakestStat].label} — уровень ${m.statLevels[m.weakestStat]}\n• ${
        weak
          ? `привычка «${weak.habit.name}» — ${formatPercent(weak.rate)} регулярности`
          : "слабых привычек не отслеживается"
      }\n• ${qs.overdue} просроченных квестов\n\nСледующий шаг: выполните один небольшой квест, который прокачивает ${
        STATS[m.weakestStat].label
      }.`,
      `Weakest areas right now:\n• ${STATS[m.weakestStat].label} — level ${
        m.statLevels[m.weakestStat]
      }\n• ${
        weak ? `${weak.habit.name} habit — ${formatPercent(weak.rate)} consistency` : "no weak habits tracked"
      }\n• ${qs.overdue} overdue quests\n\nNext action: complete one small quest that feeds ${
        STATS[m.weakestStat].label
      }.`,
    );
  }

  if (has("today", "now", "do next", "todo", "should i")) {
    const summary = daySummary(data, today);
    const openHabits = data.habits.filter((h) => !h.archived && !h.completions.includes(today));
    const openQuests = data.quests.filter((q) => !q.completed);
    const firstHabit = openHabits[0];
    const firstQuest = openQuests.find((q) => q.category === "daily") || openQuests[0];
    return L(
      `Сегодня у вас ${summary.score}/100 и ${formatNumber(summary.xp)} XP.\n• Открытых привычек: ${
        openHabits.length
      }\n• Активных квестов: ${openQuests.length}\n\nСледующий шаг: ${
        firstQuest ? `выполните «${firstQuest.title}» (+${firstQuest.xp} XP)` : "создайте дневной квест"
      }${firstHabit ? `, затем отметьте «${firstHabit.name}» (+${firstHabit.xp} XP)` : ""}.`,
      `Today you are at ${summary.score}/100 with ${formatNumber(summary.xp)} XP earned.\n• Habits open: ${
        openHabits.length
      }\n• Quests active: ${openQuests.length}\n\nNext action: ${
        firstQuest ? `complete “${firstQuest.title}” (+${firstQuest.xp} XP)` : "create a daily quest"
      }${firstHabit ? `, then check off ${firstHabit.name} (+${firstHabit.xp} XP)` : ""}.`,
    );
  }

  if (has("goal", "target", "main quest", "focus")) {
    const gs = goalStats(data.goals);
    if (gs.total === 0) {
      return L(
        "Целей пока нет. Создайте одну большую цель в разделе «Цели» — она станет вашей главной сюжетной линией.",
        "You have no goals yet. Create one big goal in the Goals section — it becomes your Main Quest line.",
      );
    }
    const lines = data.goals
      .slice(0, 3)
      .map(
        (g) =>
          `• ${g.title} — ${g.progress}% (${g.milestones.filter((x) => x.done).length}/${g.milestones.length} ${L(
            "этапов",
            "milestones",
          )})`,
      )
      .join("\n");
    return L(
      `Активные цели (${gs.completed}/${gs.total} завершено, средний прогресс ${formatPercent(
        gs.avgProgress,
        0,
      )}):\n${lines}\n\nСледующий шаг: завершите ближайший этап.`,
      `Your active goals (${gs.completed}/${gs.total} completed, average ${formatPercent(
        gs.avgProgress,
        0,
      )}):\n${lines}\n\nNext action: finish the closest milestone.`,
    );
  }

  if (has("streak")) {
    return L(
      `Ваша текущая лучшая активная серия — **${m.currentStreak} ${L("дней", "days")}**, абсолютный рекорд — **${
        m.bestStreak
      } ${L("дней", "days")}**.${
        m.currentStreak >= 7
          ? " Вы уже получаете бонус +10% к XP за серию."
          : " Дойдите до 7 дней, чтобы открыть бонус +10% к XP."
      }`,
      `Your current best active streak is **${m.currentStreak} days** and your all-time record is **${m.bestStreak} days**.${
        m.currentStreak >= 7
          ? " You are earning the +10% streak XP bonus."
          : " Reach 7 days to unlock the +10% XP bonus."
      }`,
    );
  }

  if (has("habit")) {
    if (data.habits.length === 0) {
      return L(
        "Привычек пока нет. Создайте первую — начните с того, что можно сделать за две минуты.",
        "No habits yet. Create your first one — start with something you can finish in two minutes.",
      );
    }
    const ranked = topHabits(data.habits, 3, today);
    const lines = ranked
      .map((r) => `• ${r.habit.name} — ${formatPercent(r.rate)} · ${r.streak} ${L("дн. серии", "d streak")}`)
      .join("\n");
    return L(
      `Регулярность привычек: ${formatPercent(overview.rate)}, всего ${formatNumber(
        overview.totalCompletions,
      )} отметок.\nЛучшие привычки:\n${lines}\n\nСегодня: ${overview.todayDone}/${overview.todayTotal} ${L(
        "выполнено",
        "done",
      )}.`,
      `Habit consistency: ${formatPercent(overview.rate)} overall, ${formatNumber(
        overview.totalCompletions,
      )} total check-ins.\nTop habits:\n${lines}\n\nToday: ${overview.todayDone}/${overview.todayTotal} done.`,
    );
  }

  if (has("achievement", "trophy", "badge")) {
    const done = unlockedCount(data);
    const next = ACHIEVEMENTS.find((a) => !data.achievements[a.id]?.unlockedAt);
    return L(
      `Открыто **${done} из ${ACHIEVEMENTS.length}** достижений.${
        next
          ? ` Ближайшее — «${tr(`ach.${next.id}.title`)}»: ${tr(`ach.${next.id}.desc`)}`
          : " Открыто всё. Это легендарно."
      }`,
      `You unlocked **${done} of ${ACHIEVEMENTS.length}** achievements.${
        next
          ? ` The closest one is “${tr(`ach.${next.id}.title`)}” — ${tr(`ach.${next.id}.desc`)}`
          : " Every achievement is unlocked. Legendary."
      }`,
    );
  }

  if (has("level", "xp", "progress", "life score")) {
    const ls = lifeScore(data, today);
    return L(
      `Вы на **${lvl.level} уровне** (${rankTitle(lvl.level)}) с ${formatNumber(
        data.profile.totalXp,
      )} XP — до уровня ${lvl.nextLevel} осталось ${formatNumber(lvl.xpRemaining)} XP.\nИндекс жизни: **${
        ls.score
      }/100**.\nКвесты: ${qs.completed}/${qs.total} выполнено. Привычки: ${formatPercent(overview.rate)} регулярности.`,
      `You are level **${lvl.level}** (${rankTitle(lvl.level)}) with ${formatNumber(
        data.profile.totalXp,
      )} total XP — ${formatNumber(lvl.xpRemaining)} XP to level ${lvl.nextLevel}.\nLife Score: **${
        ls.score
      }/100**.\nQuests: ${qs.completed}/${qs.total} completed. Habits: ${formatPercent(
        overview.rate,
      )} consistency.`,
    );
  }

  // ---------- Habit Matrix branches ----------

  if (has("matrixbest")) {
    const ranked = topConsistent(active, `${today.slice(0, 7)}-01`, 3, today);
    if (ranked.length === 0) {
      return L("Данных по привычкам пока нет.", "No habit data yet.");
    }
    const lines = ranked
      .map((r) => `• ${r.habit.name} — ${formatPercent(r.rate)} (${r.done}/${r.planned})`)
      .join("\n");
    return L(
      `Самая стабильная привычка этого месяца — **${ranked[0].habit.name}** (${formatPercent(
        ranked[0].rate,
      )}).
${lines}

Следующий шаг: держите её серию, чтобы сохранить бонус к XP.`,
      `Your most consistent habit this month is **${ranked[0].habit.name}** (${formatPercent(
        ranked[0].rate,
      )}).
${lines}

Next action: keep its streak alive to preserve the XP bonus.`,
    );
  }

  if (has("missedmost")) {
    const ranked = mostMissed(active, `${today.slice(0, 7)}-01`, 3, today);
    if (ranked.length === 0) {
      return L("Пропусков не зафиксировано.", "No missed days recorded.");
    }
    const lines = ranked
      .map((r) => `• ${r.habit.name} — ${formatPercent(r.rate)} (${r.missed} ${L("пропущено", "missed")})`)
      .join("\n");
    return L(
      `Чаще всего вы пропускаете **${ranked[0].habit.name}** — ${formatPercent(
        ranked[0].rate,
      )} в этом месяце.
${lines}

Следующий шаг: уменьшите привычку вдвое, чтобы её было проще не пропустить.`,
      `You skip **${ranked[0].habit.name}** the most — ${formatPercent(
        ranked[0].rate,
      )} this month.
${lines}

Next action: shrink the habit so it is easier not to skip.`,
    );
  }

  if (has("streaknow")) {
    const bonus = streakTierBonus(m.currentStreak);
    const next = nextStreakTier(m.currentStreak);
    return L(
      `Сейчас ваша лучшая активная серия — **${m.currentStreak} дней**. Рекорд — ${m.bestStreak} дней. ${
        bonus > 0
          ? `Активен бонус +${Math.round(bonus * 100)}% к XP.`
          : next
            ? `Следующий бонус на ${next.days} днях.`
            : ""
      }`,
      `Your current best active streak is **${m.currentStreak} days**. Record is ${m.bestStreak} days. ${
        bonus > 0
          ? `You have a +${Math.round(bonus * 100)}% XP bonus.`
          : next
            ? `Next bonus unlocks at ${next.days} days.`
            : ""
      }`,
    );
  }

  if (has("beststreak")) {
    return L(
      `Ваш лучший streak за всё время — **${m.bestStreak} дней**. Сейчас — ${m.currentStreak} дней.`,
      `Your all-time best streak is **${m.bestStreak} days**. Currently ${m.currentStreak} days.`,
    );
  }

  if (has("weekdaymiss")) {
    const wd = missRateByWeekday(active, 90, today);
    const worst = wd.reduce((a, b) => (b.planned > 0 && b.rate > a.rate ? b : a), wd[0]);
    const best = wd.reduce((a, b) => (b.planned > 0 && b.rate < a.rate ? b : a), wd[0]);
    if (!worst || worst.planned === 0) {
      return L("Пока недостаточно данных по дням недели.", "Not enough weekday data yet.");
    }
    return L(
      `Чаще всего вы пропускаете привычки в **${worst.label}** (${formatPercent(
        worst.rate,
      )} пропусков). Лучший день — ${best.label} (${formatPercent(best.rate)}).

Следующий шаг: ставьте на ${worst.label} самую простую привычку.`,
      `You miss habits most often on **${worst.label}** (${formatPercent(
        worst.rate,
      )} missed). Your best day is ${best.label} (${formatPercent(best.rate)}).

Next action: schedule your easiest habit on ${worst.label}.`,
    );
  }

  if (has("monthchange")) {
    const cmp = monthComparison(data, `${today.slice(0, 7)}-01`, today);
    const lines = cmp.metrics
      .map(
        (m2) =>
          `• ${tr(`cmp.${m2.key}`)}: ${m2.digits > 0 ? m2.previous.toFixed(1) : formatNumber(m2.previous)} → ${
            m2.digits > 0 ? m2.current.toFixed(1) : formatNumber(m2.current)
          } (${m2.deltaLabel})`,
      )
      .join("\n");
    return L(
      `Сравнение **${cmp.currentLabel}** с **${cmp.previousLabel}**:
${lines}

Улучшилось показателей: ${cmp.improved} из ${cmp.metrics.length}.`,
      `**${cmp.currentLabel}** vs **${cmp.previousLabel}**:
${lines}

Improved metrics: ${cmp.improved} of ${cmp.metrics.length}.`,
    );
  }

  if (has("careerhabits")) {
    const career = active.filter((h) => h.stats.includes("career"));
    if (career.length === 0) {
      return L(
        "Нет привычек, связанных с Карьерой. Свяжите их в форме создания привычки.",
        "No habits are linked to Career. Link them in the habit form.",
      );
    }
    const lines = career
      .map((h) => `• ${h.name} — +${h.xp} XP, ${h.completions.length} ${L("выполнений", "completions")}`)
      .join("\n");
    return L(
      `Карьеру прокачивают эти привычки:
${lines}

Следующий шаг: выполните первую из списка сегодня.`,
      `These habits train Career:
${lines}

Next action: complete the first one today.`,
    );
  }

  if (has("habitxp")) {
    const total = active.reduce((s, h) => s + safeHabitXp(h), 0);
    const share = data.profile.totalXp > 0 ? (total / data.profile.totalXp) * 100 : 0;
    return L(
      `Благодаря привычкам вы получили **${formatNumber(total)} XP** — это ${formatPercent(
        share,
        0,
      )} всего вашего опыта. Всего отметок: ${formatNumber(m.habitsCompleted)}.`,
      `Habits earned you **${formatNumber(total)} XP** — ${formatPercent(
        share,
        0,
      )} of your total experience. Total check-ins: ${formatNumber(m.habitsCompleted)}.`,
    );
  }

  // Default: full status report
  return L(
    `**${data.profile.name || "Игрок"} — отчёт**\n• Уровень ${lvl.level} · ${formatNumber(
      data.profile.totalXp,
    )} XP · индекс жизни ${lifeScore(data, today).score}/100\n• Привычки: ${formatPercent(
      overview.rate,
    )} регулярности, лучшая серия ${m.bestStreak} ${L("дней", "days")}\n• Квесты: ${
      qs.completed
    }/${qs.total} выполнено, ${qs.overdue} просрочено\n• Сильнейшая характеристика: ${
      STATS[m.strongestStat].label
    }\n\nСпросите про XP, привычки, финансы, цели или что сделать сегодня.`,
    `**${data.profile.name || "Player"} — status report**\n• Level ${lvl.level} · ${formatNumber(
      data.profile.totalXp,
    )} XP · Life Score ${lifeScore(data, today).score}/100\n• Habits ${formatPercent(
      overview.rate,
    )} consistent, best streak ${m.bestStreak} days\n• Quests ${qs.completed}/${qs.total} done, ${
      qs.overdue
    } overdue\n• Strongest stat: ${STATS[m.strongestStat].label}\n\nAsk me about your XP, habits, finances, goals or what to do today.`,
  );
}


/* ---------- Weekly report (always available, uses local data) ---------- */

export interface WeeklyReport {
  xp: number;
  done: number;
  planned: number;
  rate: number;
  bestHabit: string | null;
  worstHabit: string | null;
  currentStreak: number;
  longestStreak: number;
  perfectDays: number;
  activeDays: number;
}

export function weeklyReport(data: AppData, today = todayISO()): WeeklyReport {
  const active = data.habits.filter((h) => h.status !== "archived");
  let done = 0;
  let planned = 0;
  let perfectDays = 0;
  let activeDays = 0;
  for (let i = 0; i < 7; i++) {
    const iso = addDays(today, -i);
    const list = habitsPlannedOn(active, iso, today);
    if (list.length === 0) continue;
    activeDays += 1;
    const d = list.filter((h) => h.completions.includes(iso)).length;
    done += d;
    planned += list.length;
    if (d === list.length) perfectDays += 1;
  }
  const ranked = [...active]
    .map((h) => ({ h, w: habitWindowStats(h, addDays(today, -6), today, today) }))
    .filter((x) => x.w.planned > 0);
  const best = ranked.sort((a, b) => b.w.rate - a.w.rate)[0];
  const worst = ranked.sort((a, b) => a.w.rate - b.w.rate)[0];
  const streaks = streakDashboard(active, today);
  const xp = data.activity
    .filter((a) => a.createdAt.slice(0, 10) >= addDays(today, -6))
    .reduce((s, a) => s + (Number.isFinite(a.xp) ? a.xp : 0), 0);

  return {
    xp,
    done,
    planned,
    rate: planned > 0 ? (done / planned) * 100 : 0,
    bestHabit: best ? best.h.name : null,
    worstHabit: worst ? worst.h.name : null,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    perfectDays,
    activeDays,
  };
}

export function weeklyReportText(data: AppData, today = todayISO()): string {
  const r = weeklyReport(data, today);
  if (r.planned === 0) return tr("ai.notEnoughData");
  return L(
    `**${tr("ai.weekReportTitle")}**\n• ${tr("mx.totalXp")}: +${formatNumber(r.xp)}\n• ${tr(
      "mx.weekCompletion",
    )}: ${formatPercent(r.rate)} (${r.done}/${r.planned})\n• ${tr("mx.weekBest")}: ${
      r.bestHabit ?? "—"
    }\n• ${tr("mx.weekWorst")}: ${r.worstHabit ?? "—"}\n• ${tr("mx.currentStreak")}: ${
      r.currentStreak
    } ${tr("common.days")}\n• ${tr("mx.perfectDays")}: ${r.perfectDays}\n\nСледующий шаг: закройте сегодня самую пропускаемую привычку.`,
    `**${tr("ai.weekReportTitle")}**\n• ${tr("mx.totalXp")}: +${formatNumber(r.xp)}\n• ${tr(
      "mx.weekCompletion",
    )}: ${formatPercent(r.rate)} (${r.done}/${r.planned})\n• ${tr("mx.weekBest")}: ${
      r.bestHabit ?? "—"
    }\n• ${tr("mx.weekWorst")}: ${r.worstHabit ?? "—"}\n• ${tr("mx.currentStreak")}: ${
      r.currentStreak
    } ${tr("common.days")}\n• ${tr("mx.perfectDays")}: ${r.perfectDays}\n\nNext action: close your most missed habit today.`,
  );
}

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Flame, Grid3x3, ListChecks, Plus, Repeat, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { useGame } from "@/store/GameContext";
import { useUI } from "@/store/UIContext";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { ProgressBar, RadialProgress } from "@/components/ui/Progress";
import { CharacterCard, LifeScoreCard } from "@/components/rpg/CharacterCard";
import { StatCard } from "@/components/rpg/StatCard";
import { QuestItem } from "@/components/quests/QuestItem";
import { HabitCheckItem } from "@/components/habits/HabitCheckItem";
import { LineChart } from "@/components/charts/LineChart";
import { Icon } from "@/components/ui/Icon";
import { ACHIEVEMENTS, unlockedCount } from "@/lib/achievements";
import {
  daySummary,
  goalStats,
  habitFullStats,
  habitsOverview,
  lifeScore,
  questStats,
  statViews,
  xpByDay,
} from "@/lib/selectors";
import { greeting, timeAgo, todayISO } from "@/lib/date";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { useBootDelay } from "@/hooks/useMeasure";
import { dateLocale, useI18n } from "@/i18n";
import { InstallBanner } from "@/pwa/InstallUI";

export default function DashboardPage() {
  const { data, toggleQuest, toggleHabit } = useGame();
  const { navigate, openComposer } = useUI();
  const { t } = useI18n();
  const ready = useBootDelay(320);

  const today = todayISO();
  const memo = useMemo(() => {
    const summary = daySummary(data, today);
    return {
      summary,
      life: lifeScore(data, today),
      quests: questStats(data.quests, today),
      habits: habitsOverview(data.habits, today),
      goals: goalStats(data.goals),
      stats: statViews(data),
      xpWeek: xpByDay(data.activity, 14, today),
      xpToday: summary.xp,
    };
  }, [data, today]);

  const dailyQuests = useMemo(
    () =>
      data.quests
        .filter((q) => !q.completed && (q.category === "daily" || q.category === "main"))
        .slice(0, 5),
    [data.quests],
  );

  const todaysHabits = useMemo(
    () => data.habits.filter((h) => !h.archived).slice(0, 7),
    [data.habits],
  );

  const activity = useMemo(() => data.activity.slice(0, 7), [data.activity]);
  const achievementsDone = unlockedCount(data);

  if (!ready) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="skeleton h-64 lg:col-span-2" />
          <div className="skeleton h-64" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="skeleton h-72" />
          <div className="skeleton h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <InstallBanner />

      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            {new Date().toLocaleDateString(dateLocale(), { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {t(greeting())}, {data.profile.name || t("nav.profile")}
          </h1>
          <p className="mt-0.5 text-sm text-muted">{t("dash.tagline")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => openComposer("quest")}>
            <Plus size={15} /> {t("dash.newQuest")}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openComposer("habit")}>
            <Plus size={15} /> {t("dash.newHabit")}
          </Button>
        </div>
      </div>

      {/* Hero grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <CharacterCard
          data={data}
          lifeScore={memo.life.score}
          onOpenProfile={() => navigate("character")}
          className="lg:col-span-2"
        />
        <LifeScoreCard score={memo.life.score} parts={memo.life.parts} />
      </div>

      {/* Today tiles */}
      <div className="stats-grid-4">
        <StatTile
          label={t("dash.xpToday")}
          value={formatNumber(memo.xpToday)}
          hint={t("dash.xpIn", { n: 14 })}
          icon={<Zap size={14} />}
        />
        <StatTile
          label={t("dash.dailyScore")}
          value={`${memo.summary.score}`}
          hint="/ 100"
          icon={<TrendingUp size={14} />}
          tone="violet"
        />
        <StatTile
          label={t("dash.questsDone")}
          value={`${memo.quests.completed}/${memo.quests.total}`}
          hint={t("quests.activeCount", { n: memo.quests.active })}
          icon={<ListChecks size={14} />}
        />
        <StatTile
          label={t("dash.habitStreak")}
          value={`${memo.habits.currentStreak} ${t("common.days")}`}
          hint={t("habits.bestShort", { n: memo.habits.bestStreak, pct: formatPercent(memo.habits.rate, 0) })}
          icon={<Flame size={14} />}
          tone="warning"
        />
      </div>

      {/* Today's progress + stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title={t("dash.today")} subtitle={t("cal.dailySummary")} icon={<CalendarCheck size={15} />} />
          <div className="flex flex-col items-center gap-4 p-5 sm:flex-row">
            <RadialProgress
              value={memo.summary.score}
              size={112}
              color="var(--accent)"
              gradientTo="var(--accent-secondary)"
            >
              <span className="text-2xl font-semibold tabular text-ink">{memo.summary.score}</span>
              <span className="text-[9px] uppercase tracking-[0.16em] text-faint">{t("dash.score")}</span>
            </RadialProgress>
            <ul className="w-full min-w-0 space-y-2">
              <SummaryRow label={t("cal.quests")} value={`${memo.summary.quests.done}/${memo.summary.quests.total}`} />
              <SummaryRow label={t("cal.habits")} value={`${memo.summary.habits.done}/${memo.summary.habits.total}`} />
              <SummaryRow label={t("dash.moneyIn")} value={formatCurrency(memo.summary.moneyIn, data.profile.currency)} />
              <SummaryRow label={t("dash.moneyOut")} value={formatCurrency(memo.summary.moneyOut, data.profile.currency)} />
              <SummaryRow
                label={t("dash.mood")}
                value={memo.summary.mood ? `${memo.summary.mood}/10` : t("common.notSet")}
              />
            </ul>
          </div>
          <button
            onClick={() => navigate("calendar")}
            className="w-full border-t border-line py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted transition hover:text-accent"
          >
            {t("dash.openDaily")}
          </button>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={t("dash.charStats")}
            subtitle={t("dash.charStatsSub")}
            icon={<TrendingUp size={15} />}
            action={
              <button
                onClick={() => navigate("character")}
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent"
              >
                {t("common.viewAll")}
              </button>
            }
          />
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            {memo.stats.map((s) => (
              <StatCard key={s.key} stat={s} />
            ))}
          </div>
        </Card>
      </div>

      {/* Quests + habits */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("dash.dailyQuests")}
            subtitle={`${t("quests.activeCount", { n: memo.quests.active })} · ${t("quests.completedOf", { done: memo.quests.completed, total: memo.quests.total })}`}
            icon={<ListChecks size={15} />}
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate("quests")}>
                {t("nav.quests")}
              </Button>
            }
          />
          {dailyQuests.length === 0 ? (
            <EmptyState
              icon={<ListChecks size={22} />}
              title={t("dash.noQuests")}
              description={t("dash.noQuestsSub")}
              action={
                <Button size="sm" variant="primary" onClick={() => openComposer("quest")}>
                  <Plus size={15} /> {t("form.createQuest")}
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2 p-3">
              {dailyQuests.map((q) => (
                <QuestItem
                  key={q.id}
                  quest={q}
                  compact
                  onToggle={() => toggleQuest(q.id)}
                  onDelete={() => undefined}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title={t("mx.todayHabits")}
            subtitle={t("mx.todayProgress")}
            icon={<Repeat size={15} />}
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate("matrix")}>
                {t("mx.viewFullMatrix")}
              </Button>
            }
          />
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-3.5 py-3 sm:px-4">
            <RadialProgress
              value={memo.habits.todayTotal > 0 ? (memo.habits.todayDone / memo.habits.todayTotal) * 100 : 0}
              size={58}
              stroke={6}
              color="var(--accent)"
            >
              <span className="text-[13px] font-semibold tabular text-ink">
                {memo.habits.todayDone}/{memo.habits.todayTotal}
              </span>
            </RadialProgress>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted [overflow-wrap:break-word]">{t("mx.todayProgress")}</p>
              <p className="text-xl font-semibold tabular text-ink">
                {memo.habits.todayTotal > 0
                  ? Math.round((memo.habits.todayDone / memo.habits.todayTotal) * 100)
                  : 0}
                %
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => navigate("matrix")}>
                <Grid3x3 size={14} className="shrink-0" />
                <span>{t("mx.title")}</span>
              </Button>
            </div>
          </div>
          {todaysHabits.length === 0 ? (
            <EmptyState
              icon={<Repeat size={22} />}
              title={t("dash.noHabits")}
              description={t("dash.noHabitsSub")}
              action={
                <Button size="sm" variant="primary" onClick={() => openComposer("habit")}>
                  <Plus size={15} /> {t("form.createHabit")}
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-2 p-3 sm:grid-cols-2">
              {todaysHabits.map((h) => (
                <HabitCheckItem
                  key={h.id}
                  habit={h}
                  done={h.completions.includes(today)}
                  onToggle={() => toggleHabit(h.id)}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* XP chart + activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("dash.xpGrowth")} subtitle={t("dash.last14")} icon={<Zap size={15} />} />
          <div className="p-4">
            <LineChart data={memo.xpWeek} height={190} ariaLabel={t("dash.xpGrowth")} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t("dash.recentActivity")}
            subtitle={t("dash.whereXp")}
            icon={<Flame size={15} />}
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate("analytics")}>
                {t("nav.analytics")}
              </Button>
            }
          />
          {activity.length === 0 ? (
            <EmptyState
              icon={<Zap size={22} />}
              title={t("dash.noActivity")}
              description={t("dash.noActivitySub")}
            />
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
                    <Icon name={kindIcon(a.kind)} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{a.title}</p>
                    <p className="truncate text-[10px] text-faint">
                      {a.detail} · {timeAgo(a.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold tabular text-accent">
                    +{formatNumber(a.xp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Goals + achievements */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={t("dash.goals")}
            subtitle={t("an.goalProgressSub", { done: memo.goals.completed, total: memo.goals.total, avg: formatPercent(memo.goals.avgProgress, 0) })}
            icon={<Target size={15} />}
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate("goals")}>
                {t("nav.goals")}
              </Button>
            }
          />
          {data.goals.length === 0 ? (
            <EmptyState
              icon={<Target size={22} />}
              title={t("dash.noGoals")}
              description={t("dash.noGoalsSub")}
              action={
                <Button size="sm" variant="primary" onClick={() => openComposer("goal")}>
                  <Plus size={15} /> {t("form.createGoal")}
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.goals.slice(0, 4).map((g) => (
                <li key={g.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 truncate text-[13px] font-medium text-ink">{g.title}</p>
                    <span className="shrink-0 text-[11px] font-semibold tabular text-muted">
                      {Math.round(g.progress)}%
                    </span>
                  </div>
                  <ProgressBar
                    value={g.progress}
                    className="mt-2"
                    height={5}
                    color="var(--accent)"
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title={t("char.achCount")}
            subtitle={`${achievementsDone}/${ACHIEVEMENTS.length} ${t("dash.unlocked")}`}
            icon={<Trophy size={15} />}
          />
          <div className="p-5">
            <div className="flex items-center gap-4">
              <RadialProgress
                value={(achievementsDone / ACHIEVEMENTS.length) * 100}
                size={96}
                color="var(--warning)"
              >
                <span className="text-lg font-semibold tabular text-ink">{achievementsDone}</span>
                <span className="text-[9px] text-faint">{t("ach.ofTotal", { n: ACHIEVEMENTS.length })}</span>
              </RadialProgress>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] leading-relaxed text-muted">{t("dash.achHint")}</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => navigate("achievements")}>
                  {t("common.viewAll")}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Habit leaders */}
      <Card>
        <CardHeader title={t("dash.topHabits")} subtitle={t("dash.last30")} icon={<Repeat size={15} />} />
        {memo.habits.habitCount === 0 ? (
          <EmptyState icon={<Repeat size={22} />} title={t("dash.noHabitData")} description={t("dash.noHabitDataSub")} />
        ) : (
          <ul className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.habits
              .filter((h) => !h.archived)
              .map((h) => ({ h, s: habitFullStats(h, today) }))
              .sort((a, b) => b.s.last30.rate - a.s.last30.rate)
              .slice(0, 6)
              .map(({ h, s }, i) => (
                <motion.li
                  key={h.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-2.5"
                >
                  <span className="text-lg">{h.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{h.name}</p>
                    <p className="text-[10px] text-faint">
                      {formatPercent(s.last30.rate, 0)} · {s.currentStreak} {t("common.days")} ·{" "}
                      {formatNumber(s.totalCompletions)} {t("habits.totalShort")}
                    </p>
                  </div>
                </motion.li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-2 border-b border-line pb-1.5 last:border-0">
      <span className="shrink-0 text-[11px] text-faint">{label}</span>
      <span className="min-w-0 truncate text-[13px] font-semibold tabular text-ink">{value}</span>
    </li>
  );
}

function kindIcon(kind: string): string {
  switch (kind) {
    case "quest":
      return "flag";
    case "habit":
      return "check";
    case "goal":
      return "target";
    case "finance":
      return "wallet";
    case "level":
      return "zap";
    case "achievement":
      return "trophy";
    default:
      return "sparkles";
  }
}

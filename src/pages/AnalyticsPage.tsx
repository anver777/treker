import { useMemo, useState } from "react";
import { BarChart3, Flame, Target, TrendingUp, Zap } from "lucide-react";
import { useGame } from "@/store/GameContext";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Chips } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Feedback";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { ProgressBar } from "@/components/ui/Progress";
import {
  cumulativeXpByDay,
  dayScores,
  financeByMonth,
  goalStats,
  habitCompletionsByDay,
  habitsOverview,
  questStats,
  statViews,
  weekdayActivity,
  xpByDay,
} from "@/lib/selectors";
import { levelInfo } from "@/lib/xp";
import { compactNumber, formatNumber, formatPercent } from "@/lib/format";
import { todayISO } from "@/lib/date";
import { STATS } from "@/lib/stats";
import { useI18n } from "@/i18n";

const RANGES = ["7", "30", "90"] as const;

export default function AnalyticsPage() {
  const { data } = useGame();
  const { t } = useI18n();
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const days = parseInt(range, 10);
  const today = todayISO();

  const memo = useMemo(
    () => ({
      xp: xpByDay(data.activity, days, today),
      cumulative: cumulativeXpByDay(data.activity, days, data.profile.totalXp, today),
      habits: habitCompletionsByDay(data.habits, days, today),
      scores: dayScores(data, days, today),
      weekday: weekdayActivity(data),
      finance: financeByMonth(data.transactions, 6, today),
      quests: questStats(data.quests, today),
      habitsOverview: habitsOverview(data.habits, today),
      goals: goalStats(data.goals),
      stats: statViews(data),
    }),
    [data, days, today],
  );

  const totalXpIn = memo.xp.reduce((s, d) => s + d.value, 0);
  const bestDay = memo.xp.reduce((a, b) => (b.value > a.value ? b : a), memo.xp[0] || { label: "—", value: 0 });
  const info = levelInfo(data.profile.totalXp);
  const hasData = data.activity.length > 0 || data.habits.length > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{t("an.title")}</h2>
          <p className="text-[11px] text-faint">{t("an.sub")}</p>
        </div>
        <Chips
          value={range}
          onChange={setRange}
          options={RANGES.map((r) => ({ value: r, label: t(`an.range${r}`) }))}
        />
      </div>

      <div className="stats-grid-4">
        <StatTile
          label={t("an.xpIn", { n: days })}
          value={formatNumber(totalXpIn)}
          hint={t("an.avgPerDay", { n: compactNumber(days > 0 ? totalXpIn / days : 0) })}
          icon={<Zap size={14} />}
        />
        <StatTile label={t("an.bestDay")} value={formatNumber(bestDay?.value || 0)} hint={bestDay?.label || "—"} tone="violet" />
        <StatTile
          label={t("cal.avgDailyScore")}
          value={formatNumber(
            memo.scores.length ? memo.scores.reduce((s, d) => s + d.value, 0) / memo.scores.length : 0,
          )}
          hint="/ 100"
        />
        <StatTile
          label={t("an.habitConsistency")}
          value={formatPercent(memo.habitsOverview.rate)}
          hint={t("an.checkins", { n: memo.habitsOverview.totalCompletions })}
          tone="warning"
          icon={<Flame size={14} />}
        />
      </div>

      {!hasData ? (
        <Card>
          <EmptyState
            icon={<BarChart3 size={22} />}
            title={t("an.notEnoughData")}
            description={t("an.notEnoughDataSub")}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title={t("an.xpGrowth")} subtitle={t("an.dailyXp", { n: days })} icon={<Zap size={15} />} />
              <div className="p-4">
                <LineChart data={memo.xp} height={200} ariaLabel={t("an.xpGrowth")} />
              </div>
            </Card>

            <Card>
              <CardHeader
                title={t("an.levelProgression")}
                subtitle={t("an.totalXpOver", { n: days })}
                icon={<TrendingUp size={15} />}
              />
              <div className="p-4">
                <LineChart
                  data={memo.cumulative}
                  height={200}
                  color="var(--accent-secondary)"
                  colorTo="var(--violet)"
                  area={false}
                  ariaLabel={t("an.levelProgression")}
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title={t("an.habitCompletions")} subtitle={t("an.habitCompletionsSub", { n: days })} icon={<Flame size={15} />} />
              <div className="p-4">
                <BarChart
                  data={memo.habits.map((d) => ({ label: d.label, value: d.value }))}
                  height={200}
                  ariaLabel={t("an.habitCompletions")}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title={t("an.dailyScore")} subtitle={t("an.dailyScoreSub", { n: days })} icon={<Target size={15} />} />
              <div className="p-4">
                <LineChart
                  data={memo.scores}
                  height={200}
                  color="var(--violet)"
                  colorTo="var(--accent-secondary)"
                  ariaLabel={t("an.dailyScore")}
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title={t("an.questCompletion")} subtitle={t("an.questCompletionSub")} icon={<Target size={15} />} />
              <div className="p-4">
                <DonutChart
                  size={160}
                  centerLabel={t("common.completed")}
                  centerValue={formatPercent(memo.quests.rate, 0)}
                  data={[
                    { label: t("common.completed"), value: memo.quests.completed, color: "var(--accent)" },
                    { label: t("common.active"), value: memo.quests.active, color: "var(--accent-secondary)" },
                  ]}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title={t("an.weeklyActivity")} subtitle={t("an.weeklyActivitySub")} icon={<BarChart3 size={15} />} />
              <div className="p-4">
                <BarChart
                  data={memo.weekday.map((d) => ({ label: d.label, value: d.value }))}
                  height={190}
                  color="var(--accent)"
                  ariaLabel={t("an.weeklyActivity")}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title={t("an.incomeExpenses")} subtitle={t("an.incomeExpensesSub")} icon={<TrendingUp size={15} />} />
              <div className="p-4">
                <BarChart
                  data={memo.finance.map((m) => ({
                    label: m.label,
                    value: m.income,
                    secondary: m.expense,
                  }))}
                  height={190}
                  legend={{ primary: t("fin.income"), secondary: t("fin.expenses") }}
                  ariaLabel={t("an.incomeExpenses")}
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title={t("dash.charStats")} subtitle={t("an.charStatsSub", { level: info.level, xp: formatNumber(data.profile.totalXp) })} />
              <ul className="space-y-3 p-4">
                {memo.stats.map((s) => (
                  <li key={s.key} className="flex min-w-0 items-center gap-3">
                    <span className="w-[78px] shrink-0 truncate text-[11px] text-faint">
                      {STATS[s.key].short}
                    </span>
                    <span className="min-w-0 flex-1">
                      <ProgressBar value={Math.min(100, (s.level / 70) * 100)} color={STATS[s.key].color} height={6} />
                    </span>
                    <span className="w-9 shrink-0 text-right text-[11px] font-semibold tabular text-ink">
                      {s.level}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader
                title={t("dash.goals")}
                subtitle={t("an.goalProgressSub", { done: memo.goals.completed, total: memo.goals.total, avg: formatPercent(memo.goals.avgProgress, 0) })}
                icon={<Target size={15} />}
              />
              {data.goals.length === 0 ? (
                <EmptyState icon={<Target size={20} />} title={t("an.noGoals")} description={t("an.noGoalsSub")} />
              ) : (
                <ul className="space-y-3 p-4">
                  {data.goals.slice(0, 6).map((g) => (
                    <li key={g.id} className="flex min-w-0 items-center gap-3">
                      <span className="w-[110px] shrink-0 truncate text-[11px] text-muted">{g.title}</span>
                      <span className="min-w-0 flex-1">
                        <ProgressBar value={g.progress} height={6} />
                      </span>
                      <span className="w-9 shrink-0 text-right text-[11px] font-semibold tabular text-ink">
                        {Math.round(g.progress)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

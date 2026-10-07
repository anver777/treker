import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Flame,
  Grid3x3,
  Plus,
  Search,
  Trophy,
} from "lucide-react";
import { useGame } from "@/store/GameContext";
import { useUI } from "@/store/UIContext";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chips, Select } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Feedback";
import { ProgressBar, RadialProgress } from "@/components/ui/Progress";
import { HabitMatrixGrid, MatrixLegend } from "@/components/habits/HabitMatrixGrid";
import { HabitDetailsModal } from "@/components/habits/HabitDetailsModal";
import { ProgressChart, ActivityHeatmap } from "@/components/charts/ProgressChart";
import { HABIT_CATEGORIES } from "@/lib/stats";
import { useI18n } from "@/i18n";
import { formatNumber, formatPercent } from "@/lib/format";
import { monthLabel, todayISO, dayLabel } from "@/lib/date";
import {
  activityHeatmap,
  buildMatrix,
  missRateByWeekday,
  monthComparison,
  monthDays,
  monthProgress,
  monthSummary,
  monthWeeks,
  mostMissed,
  progressByDay,
  progressByWeek,
  streakDashboard,
  topConsistent,
} from "@/lib/habitMatrix";
import { daySummary } from "@/lib/selectors";
import { streakTierBonus, nextStreakTier } from "@/lib/xp";
import { cn } from "@/utils/cn";

type StatusFilter = "all" | "active" | "paused" | "archived";
type SortKey = "name" | "completion" | "streak" | "xp" | "missed";

export default function HabitMatrixPage() {
  const { data, toggleHabit } = useGame();
  const { openComposer } = useUI();
  const { t } = useI18n();
  const today = todayISO();

  const [anchor, setAnchor] = useState(`${today.slice(0, 7)}-01`);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [sort, setSort] = useState<SortKey>("completion");
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const weeks = useMemo(() => monthWeeks(anchor), [anchor]);
  const weekIndexOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of weeks) for (const d of w.days) map.set(d, w.index);
    return (iso: string) => map.get(iso) ?? 1;
  }, [weeks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data.habits.filter((h) => {
      if (status !== "all" && h.status !== status) return false;
      if (category !== "all" && h.category !== category) return false;
      if (q && !h.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return list;
  }, [data.habits, query, category, status]);

  const rows = useMemo(() => {
    const matrix = buildMatrix(filtered, anchor, today);
    const sorted = [...matrix];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.habit.name.localeCompare(b.habit.name);
        case "streak":
          return b.stats.currentStreak - a.stats.currentStreak;
        case "xp":
          return b.stats.xpEarned - a.stats.xpEarned;
        case "missed":
          return b.stats.missed - a.stats.missed;
        case "completion":
        default:
          return b.stats.rate - a.stats.rate;
      }
    });
    return sorted;
  }, [filtered, anchor, today, sort]);

  const progress = useMemo(() => monthProgress(filtered, anchor, today), [filtered, anchor, today]);
  const byDay = useMemo(() => progressByDay(filtered, anchor, today), [filtered, anchor, today]);
  const byWeek = useMemo(() => progressByWeek(filtered, anchor, today), [filtered, anchor, today]);
  const best = useMemo(() => topConsistent(filtered, anchor, 10, today), [filtered, anchor, today]);
  const worst = useMemo(() => mostMissed(filtered, anchor, 10, today), [filtered, anchor, today]);
  const summary = useMemo(() => monthSummary(data, anchor, today), [data, anchor, today]);
  const comparison = useMemo(() => monthComparison(data, anchor, today), [data, anchor, today]);
  const streaks = useMemo(() => streakDashboard(data.habits, today), [data.habits, today]);
  const heat = useMemo(() => activityHeatmap(data, 18, today), [data, today]);
  const missWeekday = useMemo(
    () => missRateByWeekday(data.habits.filter((h) => h.status !== "archived"), 90, today),
    [data.habits, today],
  );
  const days = useMemo(() => monthDays(anchor), [anchor]);

  const shiftMonth = (delta: number) => {
    const [y, m] = anchor.split("-").map((n) => parseInt(n, 10));
    const d = new Date(y, m - 1 + delta, 1);
    const iso = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-01`;
    if (iso.slice(0, 7) > today.slice(0, 7)) return;
    setAnchor(iso);
  };

  const detailsHabit = detailsId ? data.habits.find((h) => h.id === detailsId) ?? null : null;
  const worstWeekday = missWeekday.reduce(
    (max, d) => (d.planned > 0 && d.rate > max.rate ? d : max),
    missWeekday[0] ?? { label: "—", rate: 0, missed: 0, planned: 0 },
  );
  const bonusPct = Math.round(streakTierBonus(streaks.current) * 100);
  const nextTier = nextStreakTier(streaks.current);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ---------- header ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight text-ink sm:text-xl">
            {t("mx.title")}
          </h2>
          <p className="truncate text-[11px] text-faint">{t("mx.sub")}</p>
        </div>
        <Button size="sm" variant="primary" onClick={() => openComposer("habit")}>
          <Plus size={15} /> {t("mx.addHabit")}
        </Button>
      </div>

      {/* ---------- top stats ---------- */}
      <div className="stats-grid-4">
        <StatTile
          label={t("mx.monthlyProgress")}
          value={formatPercent(progress.rate)}
          hint={t("mx.completedOf", {
            done: formatNumber(progress.done),
            planned: formatNumber(progress.planned),
          })}
          icon={<Grid3x3 size={14} />}
        />
        <StatTile
          label={t("mx.currentStreak")}
          value={`${streaks.current} ${t("common.days")}`}
          hint={bonusPct > 0 ? t("mx.streakBonusActive", { n: bonusPct }) : t("mx.longestStreak")}
          icon={<Flame size={14} />}
          tone="warning"
        />
        <StatTile
          label={t("mx.longestStreak")}
          value={`${streaks.longest} ${t("common.days")}`}
          hint={
            streaks.bestHabit
              ? streaks.bestHabit.habit.name
              : nextTier
                ? t("mx.nextTier", { n: nextTier.days })
                : "—"
          }
          icon={<Trophy size={14} />}
          tone="warning"
        />
        <StatTile
          label={t("mx.totalXp")}
          value={formatNumber(summary.xp)}
          hint={t("mx.perfectDays") + `: ${summary.perfectDays}`}
          tone="violet"
        />
      </div>

      {/* ---------- matrix ---------- */}
      <Card>
        <CardHeader
          title={monthLabel(anchor)}
          subtitle={t("mx.completedOf", {
            done: formatNumber(progress.done),
            planned: formatNumber(progress.planned),
          })}
          icon={<Grid3x3 size={15} />}
          action={
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => shiftMonth(-1)}
                aria-label={t("mx.prevMonth")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent active:scale-90"
              >
                ‹
              </button>
              <button
                onClick={() => setAnchor(`${today.slice(0, 7)}-01`)}
                className="h-9 rounded-lg border border-line px-2.5 text-[11px] font-medium text-muted transition hover:border-accent hover:text-accent"
              >
                {t("common.today")}
              </button>
              <button
                onClick={() => shiftMonth(1)}
                disabled={anchor.slice(0, 7) >= today.slice(0, 7)}
                aria-label={t("mx.nextMonth")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent active:scale-90 disabled:opacity-30"
              >
                ›
              </button>
            </div>
          }
        />

        <div className="space-y-3 p-3 sm:p-4">
          <ProgressBar value={progress.rate} height={7} />

          {/* toolbar */}
          <div className="flex flex-col gap-2">
            <div className="relative min-w-0">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("mx.searchPlaceholder")}
                aria-label={t("mx.searchPlaceholder")}
                className="h-11 w-full rounded-xl border border-line bg-surface-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-faint focus:border-accent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                {t("mx.filter.label")}
              </span>
              <Chips
                value={category}
                onChange={setCategory}
                options={[
                  { value: "all", label: t("mx.filter.all") },
                  ...HABIT_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                {t("mx.sort.label")}
              </span>
              <div className="min-w-[150px] flex-1 sm:max-w-[210px]">
                <Select
                  value={sort}
                  onChange={(v) => setSort(v as SortKey)}
                  options={[
                    { value: "completion", label: t("mx.sort.completion") },
                    { value: "name", label: t("mx.sort.name") },
                    { value: "streak", label: t("mx.sort.streak") },
                    { value: "xp", label: t("mx.sort.xp") },
                    { value: "missed", label: t("mx.sort.missed") },
                  ]}
                />
              </div>
              <div className="min-w-0 flex-1">
                <Chips
                  value={status}
                  onChange={(v) => setStatus(v as StatusFilter)}
                  options={[
                    { value: "active", label: t("mx.status.active") },
                    { value: "paused", label: t("mx.status.paused") },
                    { value: "archived", label: t("mx.status.archived") },
                  ]}
                />
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={<Grid3x3 size={22} />}
              title={t("mx.noHabits")}
              description={t("mx.noHabitsSub")}
              action={
                <Button size="sm" variant="primary" onClick={() => openComposer("habit")}>
                  <Plus size={15} /> {t("mx.addHabit")}
                </Button>
              }
            />
          ) : (
            <>
              {/* week labels */}
              <div className="mx-scroll -mx-1 overflow-x-auto overscroll-x-contain px-1">
                <div className="flex min-w-max">
                  <div className="w-[164px] shrink-0 sm:w-[196px] lg:w-[208px]" />
                  {weeks.map((w) => (
                    <div
                      key={w.label}
                      className="shrink-0 border-l border-line pl-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-faint"
                      style={{ width: w.days.length * 34 }}
                    >
                      {t("mx.week", { n: w.index })}
                    </div>
                  ))}
                </div>
              </div>

              <HabitMatrixGrid
                rows={rows}
                days={days}
                weekIndexOf={weekIndexOf}
                onToggle={(habitId, iso) => toggleHabit(habitId, iso)}
                onOpenDetails={setDetailsId}
                todayISOValue={today}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <MatrixLegend />
                <span className="text-[10px] text-faint">{t("mx.matrixHint")}</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* ---------- charts ---------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("mx.progressByDay")}
            subtitle={t("mx.progressByDaySub")}
            icon={<BarChart3 size={15} />}
          />
          <div className="p-4">
            <ProgressChart
              data={byDay.map((d) => ({
                key: d.iso,
                label: String(d.day),
                rate: d.rate,
                done: d.done,
                planned: d.planned,
                caption: dayLabel(d.iso),
              }))}
              emptyLabel={t("mx.noDataSub")}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t("mx.progressByWeek")}
            subtitle={t("mx.progressByWeekSub")}
            icon={<CalendarDays size={15} />}
          />
          <div className="p-4">
            <ProgressChart
              data={byWeek.map((w) => ({
                key: w.label,
                label: w.label,
                rate: w.rate,
                done: w.done,
                planned: w.planned,
                caption: t("mx.week", { n: w.index }),
              }))}
              color="var(--accent-secondary)"
              emptyLabel={t("mx.noDataSub")}
            />
          </div>
        </Card>
      </div>

      {/* ---------- rankings ---------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("mx.topConsistent")} subtitle={monthLabel(anchor)} icon={<Trophy size={15} />} />
          {best.length === 0 ? (
            <EmptyState icon={<Trophy size={20} />} title={t("mx.noData")} description={t("mx.noDataSub")} />
          ) : (
            <ol className="divide-y divide-line">
              {best.map((r, i) => (
                <li key={r.habit.id} className="flex min-w-0 items-center gap-2.5 px-4 py-2">
                  <span className="w-4 shrink-0 text-center text-[11px] font-bold tabular text-faint">
                    {i + 1}
                  </span>
                  <span className="shrink-0 text-base">{r.habit.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                    {r.habit.name}
                  </span>
                  <span className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-line sm:w-20">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${Math.min(100, r.rate)}%`, background: r.habit.color }}
                    />
                  </span>
                  <span className="w-11 shrink-0 text-right text-[12px] font-semibold tabular text-ink">
                    {Math.round(r.rate)}%
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <CardHeader title={t("mx.mostMissed")} subtitle={t("mx.mostMissedSub")} icon={<Flame size={15} />} />
          {worst.length === 0 ? (
            <EmptyState icon={<Flame size={20} />} title={t("mx.noData")} description={t("mx.noDataSub")} />
          ) : (
            <ol className="divide-y divide-line">
              {worst.map((r, i) => (
                <li key={r.habit.id} className="flex min-w-0 items-center gap-2.5 px-4 py-2">
                  <span className="w-4 shrink-0 text-center text-[11px] font-bold tabular text-faint">
                    {i + 1}
                  </span>
                  <span className="shrink-0 text-base">{r.habit.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                    {r.habit.name}
                  </span>
                  <span className="shrink-0 tabular text-[11px] text-faint">
                    {formatNumber(r.missed)}
                  </span>
                  <span className="w-11 shrink-0 text-right text-[12px] font-semibold tabular text-danger">
                    {Math.round(r.rate)}%
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* ---------- streak dashboard + heatmap ---------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title={t("mx.streakDashboard")} icon={<Flame size={15} />} />
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-4">
              <RadialProgress
                value={Math.min(100, (streaks.current / Math.max(1, streaks.longest)) * 100)}
                size={92}
                color="var(--warning)"
              >
                <span className="text-lg font-semibold tabular text-ink">{streaks.current}</span>
                <span className="text-[9px] text-faint">{t("common.days")}</span>
              </RadialProgress>
              <div className="min-w-0 flex-1 space-y-2">
                <Row label={t("mx.longestStreak")} value={`${streaks.longest}`} />
                <Row
                  label={t("mx.averageStreak")}
                  value={`${streaks.average}`}
                />
                <Row
                  label={t("mx.bestHabitStreak")}
                  value={streaks.bestHabit ? streaks.bestHabit.habit.name : "—"}
                />
                <Row
                  label={t("mx.activeStreaks", { n: streaks.activeStreaks })}
                  value={`${streaks.activeStreaks}`}
                />
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface-2/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                {t("mx.streakCalendar")}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from({ length: 28 }).map((_, i) => {
                  const iso = new Date(today);
                  iso.setDate(iso.getDate() - (27 - i));
                  const key = iso.toISOString().slice(0, 10);
                  const active = data.habits.some(
                    (h) => h.status !== "archived" && h.completions.includes(key),
                  );
                  return (
                    <span
                      key={key}
                      title={key}
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 rounded-[4px] border",
                        active ? "border-transparent bg-warning" : "border-line bg-surface-hover",
                      )}
                    />
                  );
                })}
              </div>
              {worstWeekday && worstWeekday.planned > 0 ? (
                <p className="mt-2.5 text-[10px] leading-relaxed text-faint">
                  {t("ai.q.weekdayMiss")}: <span className="text-ink">{worstWeekday.label}</span> ·{" "}
                  {formatPercent(worstWeekday.rate, 0)}
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={t("mx.heatmap")}
            subtitle={t("mx.heatmapSub")}
            icon={<BarChart3 size={15} />}
          />
          <div className="p-4">
            <ActivityHeatmap columns={heat.columns} />
          </div>
        </Card>
      </div>

      {/* ---------- monthly report + comparison ---------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("mx.monthSummary")} subtitle={summary.label} icon={<Trophy size={15} />} />
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
            <Metric label={t("mx.totalXp")} value={formatNumber(summary.xp)} tone="accent" />
            <Metric label={t("mx.habitCompletion")} value={formatPercent(summary.habitRate)} />
            <Metric label={t("mx.bestStreak")} value={`${summary.bestStreak}`} tone="warning" />
            <Metric
              label={t("mx.mostConsistent")}
              value={summary.bestHabit ? summary.bestHabit.habit.name : "—"}
            />
            <Metric
              label={t("mx.mostMissedHabit")}
              value={summary.worstHabit ? summary.worstHabit.habit.name : "—"}
            />
            <Metric label={t("mx.perfectDays")} value={`${summary.perfectDays}`} />
            <Metric
              label={t("mx.questsLabel")}
              value={`${summary.questsDone}/${summary.questsTotal}`}
            />
            <Metric label={t("mx.goalsActive")} value={`${summary.goalsActive}`} />
            <Metric
              label={t("mx.achievementsUnlocked")}
              value={`${summary.achievementsUnlocked}`}
              tone="violet"
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t("mx.comparison")}
            subtitle={`${comparison.currentLabel} ${t("mx.vs")} ${comparison.previousLabel}`}
            icon={<BarChart3 size={15} />}
          />
          <p className="px-4 pt-3 text-[11px] text-faint">
            {t("mx.improvedMetrics", { n: comparison.improved, total: comparison.metrics.length })}
          </p>
          <ul className="divide-y divide-line p-1">
            {comparison.metrics.map((m) => {
              const up = m.delta > 0;
              const down = m.delta < 0;
              return (
                <li key={m.key} className="flex min-w-0 flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="min-w-0 flex-1 basis-[120px] text-[12px] leading-snug text-muted [overflow-wrap:break-word]">
                    {t(`cmp.${m.key}`)}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="flex shrink-0 items-baseline gap-1">
                      <span className="text-[11px] tabular text-faint">
                        {m.digits > 0 ? m.previous.toFixed(1) : formatNumber(m.previous)}
                      </span>
                      <span className="text-[10px] text-faint">→</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-[13px] font-semibold tabular",
                        up ? "text-accent" : down ? "text-danger" : "text-muted",
                      )}
                    >
                      {m.digits > 0 ? m.current.toFixed(1) : formatNumber(m.current)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular",
                        up ? "bg-accent/12 text-accent" : down ? "bg-danger/12 text-danger" : "bg-line text-faint",
                      )}
                    >
                      {up ? (
                        <ArrowUpRight size={11} className="shrink-0" />
                      ) : down ? (
                        <ArrowDownRight size={11} className="shrink-0" />
                      ) : null}
                      <span>{m.deltaLabel}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* ---------- daily summary for selected month day ---------- */}
      <Card>
        <CardHeader title={t("cal.dailySummary")} subtitle={monthLabel(anchor)} icon={<CalendarDays size={15} />} />
        <div className="p-1">
          <ul className="divide-y divide-line">
            {byDay
              .filter((d) => d.iso <= today)
              .slice(-7)
              .reverse()
              .map((d) => {
                const s = daySummary(data, d.iso, today);
                return (
                  <li key={d.iso} className="flex min-w-0 items-center gap-2 px-3 py-2.5 sm:gap-3">
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
                      {dayLabel(d.iso)}
                    </span>
                    <span className="shrink-0 tabular text-[11px] text-muted">
                      {d.done}/{d.planned}
                    </span>
                    <span className="hidden h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-line min-[400px]:block sm:w-20">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${Math.min(100, d.rate)}%` }}
                      />
                    </span>
                    <span className="shrink-0 text-right text-[12px] font-semibold tabular text-ink">
                      {d.planned > 0 ? `${Math.round(d.rate)}%` : "—"}
                    </span>
                    <span className="shrink-0 text-right text-[11px] font-semibold tabular text-accent">
                      +{formatNumber(s.xp)}
                    </span>
                    <span className="shrink-0 text-right text-[11px] font-semibold tabular text-violet">
                      {s.score}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      </Card>

      <HabitDetailsModal habit={detailsHabit} onClose={() => setDetailsId(null)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2">
      <span className="min-w-0 flex-1 truncate text-[11px] text-faint">{label}</span>
      <span className="shrink-0 truncate text-[12px] font-semibold tabular text-ink">{value}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "warning" | "violet";
}) {
  const color =
    tone === "accent"
      ? "text-accent"
      : tone === "warning"
        ? "text-warning"
        : tone === "violet"
          ? "text-violet"
          : "text-ink";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0 rounded-xl border border-line bg-surface-2/40 p-2.5"
    >
      <p className="line-clamp-2 text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-faint">
        {label}
      </p>
      <p className={cn("mt-1 text-[13px] font-semibold leading-tight tabular sm:text-[15px]", color)}>
        <span className="break-words">{value}</span>
      </p>
    </motion.div>
  );
}

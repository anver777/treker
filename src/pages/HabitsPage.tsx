import { useMemo, useState } from "react";
import { ChevronDown, Flame, Grid3x3, Plus, Repeat, Trash2, TrendingUp } from "lucide-react";
import { useGame } from "@/store/GameContext";
import { useUI } from "@/store/UIContext";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { HabitCheckItem, HabitRing, StreakFlare } from "@/components/habits/HabitCheckItem";
import { HabitCalendar } from "@/components/habits/HabitCalendar";
import { STATS } from "@/lib/stats";
import {
  habitFullStats,
  habitsOverview,
  topHabits,
} from "@/lib/selectors";
import { formatNumber, formatPercent } from "@/lib/format";
import { monthKey, todayISO } from "@/lib/date";
import { cn } from "@/utils/cn";
import { useI18n } from "@/i18n";

export default function HabitsPage() {
  const { data, toggleHabit, deleteHabit } = useGame();
  const { openComposer, navigate } = useUI();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [anchorByHabit, setAnchorByHabit] = useState<Record<string, string>>({});
  const today = todayISO();

  const overview = useMemo(() => habitsOverview(data.habits, today), [data.habits, today]);
  const ranked = useMemo(() => topHabits(data.habits, 10, today), [data.habits, today]);
  const active = data.habits.filter((h) => !h.archived);

  const todayPct =
    overview.todayTotal > 0 ? Math.round((overview.todayDone / overview.todayTotal) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="stats-grid-5">
        <StatTile
          label={t("habits.completionRate")}
          value={formatPercent(overview.rate)}
          hint={t("habits.completionSub", {
            done: formatNumber(overview.totalCompletions),
            planned: formatNumber(overview.planned),
          })}
          icon={<TrendingUp size={14} />}
        />
        <StatTile
          label={t("habits.totalCompletions")}
          value={formatNumber(overview.totalCompletions)}
          hint={t("habits.habitsCount", { n: overview.habitCount })}
        />
        <StatTile
          label={t("habits.currentStreak")}
          value={`${overview.currentStreak} ${t("common.days")}`}
          icon={<Flame size={14} />}
          tone="warning"
        />
        <StatTile
          label={t("habits.bestStreak")}
          value={`${overview.bestStreak} ${t("common.days")}`}
          tone="warning"
          hint={t("quests.allTime")}
        />
        <StatTile
          label={t("habits.consistency")}
          value={overview.consistency.label}
          hint={t("habits.consistencySub", { n: formatPercent(overview.rate, 0) })}
          tone="violet"
        />
      </div>

      <Card>
        <CardHeader
          title={t("mx.todayHabits")}
          subtitle={t("habits.todaySub", { done: overview.todayDone, total: overview.todayTotal })}
          icon={<Repeat size={15} />}
          action={
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => navigate("matrix")}>
                <Grid3x3 size={14} className="shrink-0" />
                <span>{t("mx.viewFullMatrix")}</span>
              </Button>
              <Button size="sm" variant="primary" onClick={() => openComposer("habit")}>
                <Plus size={14} className="shrink-0" />
                <span>{t("dash.newHabit")}</span>
              </Button>
            </div>
          }
        />
        {active.length > 0 ? (
          <div className="flex items-center gap-3 border-b border-line bg-surface-2/30 px-3.5 py-2.5 sm:px-5">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-500"
                style={{ width: `${todayPct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold tabular text-accent">
              {overview.todayDone}/{overview.todayTotal} · {todayPct}%
            </span>
          </div>
        ) : null}
        {active.length === 0 ? (
          <EmptyState
            icon={<Repeat size={22} />}
            title={t("habits.noHabits")}
            description={t("habits.noHabitsSub")}
            action={
              <Button size="sm" variant="primary" onClick={() => openComposer("habit")}>
                <Plus size={15} /> {t("form.createHabit")}
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
            {active.map((h) => (
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

      <Card>
        <CardHeader
          title={t("habits.allHabits")}
          subtitle={t("habits.allHabitsSub")}
          icon={<Repeat size={15} />}
        />
        {active.length === 0 ? (
          <EmptyState icon={<Repeat size={22} />} title={t("habits.nothingToTrack")} description={t("habits.nothingToTrackSub")} />
        ) : (
          <ul className="divide-y divide-line">
            {active.map((h) => {
              const s = habitFullStats(h, today);
              const open = expanded === h.id;
              const anchor = anchorByHabit[h.id] || `${monthKey(today)}-01`;
              return (
                <li key={h.id} className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2 p-3 sm:gap-3 sm:px-4">
                    <button
                      type="button"
                      onClick={() => toggleHabit(h.id)}
                      aria-pressed={h.completions.includes(today)}
                      aria-label={h.name}
                      className={cn(
                        "flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border text-lg transition active:scale-90",
                        h.completions.includes(today)
                          ? "border-transparent"
                          : "border-line hover:border-line-strong",
                      )}
                      style={
                        h.completions.includes(today)
                          ? { background: h.color, color: "#04150e" }
                          : undefined
                      }
                    >
                      {h.completions.includes(today) ? "✓" : h.icon}
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : h.id)}
                      aria-expanded={open}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left sm:gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="min-w-0 text-sm font-semibold leading-snug text-ink [overflow-wrap:break-word]">
                            {h.name}
                          </p>
                          <StreakFlare streak={s.currentStreak} />
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-faint [overflow-wrap:break-word]">
                          {STATS[h.stat].short} · +{h.xp} XP · {formatNumber(s.totalCompletions)}{" "}
                          {t("habits.totalShort")}
                        </p>
                      </div>
                      <HabitRing rate={s.last30.rate} color={h.color} size={38} />
                      <ChevronDown
                        size={16}
                        className={cn("shrink-0 text-faint transition-transform", open && "rotate-180")}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteHabit(h.id)}
                      aria-label={`${t("common.delete")}: ${h.name}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-faint transition hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {open ? (
                    <div className="grid gap-4 border-t border-line bg-surface-2/30 p-3 sm:p-4 lg:grid-cols-2">
                      <HabitCalendar
                        habit={h}
                        anchor={anchor}
                        onAnchorChange={(iso) => setAnchorByHabit((prev) => ({ ...prev, [h.id]: iso }))}
                      />
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2">
                        <MiniStat label={t("habits.stat.currentStreak")} value={`${s.currentStreak} ${t("common.days")}`} />
                        <MiniStat label={t("habits.stat.bestStreak")} value={`${s.bestStreak} ${t("common.days")}`} />
                        <MiniStat label={t("habits.stat.completion")} value={formatPercent(s.rate)} />
                        <MiniStat label={t("habits.stat.total")} value={formatNumber(s.totalCompletions)} />
                        <MiniStat label={t("habits.stat.last30")} value={formatPercent(s.last30.rate)} />
                        <MiniStat label={t("habits.stat.missed30")} value={formatNumber(s.missedLast30)} />
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title={t("habits.top10")}
          subtitle={t("dash.last30")}
          icon={<TrendingUp size={15} />}
        />
        {ranked.length === 0 ? (
          <EmptyState icon={<Repeat size={22} />} title={t("habits.noRanking")} description={t("habits.noRankingSub")} />
        ) : (
          <ol className="divide-y divide-line">
            {ranked.map((r, i) => (
              <li key={r.habit.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 shrink-0 text-center text-[11px] font-bold tabular text-faint">
                  {i + 1}
                </span>
                <span className="text-base">{r.habit.icon}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                  {r.habit.name}
                </span>
                <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-line sm:w-28">
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
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface/60 p-2.5">
      <p className="text-[9px] font-semibold uppercase leading-[1.25] tracking-[0.06em] text-faint [overflow-wrap:break-word]">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold leading-tight tabular text-ink [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

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

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 lg:gap-4">
        <StatTile
          label={t("habits.completionRate")}
          value={formatPercent(overview.rate)}
          hint={t("habits.completionSub", {
            done: formatNumber(overview.totalCompletions),
            planned: formatNumber(overview.planned),
          })}
          icon={<TrendingUp size={15} />}
        />
        <StatTile
          label={t("habits.totalCompletions")}
          value={formatNumber(overview.totalCompletions)}
          hint={t("habits.habitsCount", { n: overview.habitCount })}
        />
        <StatTile label={t("habits.currentStreak")} value={`${overview.currentStreak} ${t("common.days")}`} icon={<Flame size={15} />} tone="warning" />
        <StatTile label={t("habits.bestStreak")} value={`${overview.bestStreak} ${t("common.days")}`} tone="warning" hint={t("quests.allTime")} />
        <StatTile
          full
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
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="ghost" onClick={() => navigate("matrix")}>
                <Grid3x3 size={15} /> {t("mx.viewFullMatrix")}
              </Button>
              <Button size="sm" variant="primary" onClick={() => openComposer("habit")}>
                <Plus size={15} /> {t("dash.newHabit")}
              </Button>
            </div>
          }
        />
        {active.length === 0 ? (
          <EmptyState
            icon={<Repeat size={22} />}
            title={t("habits.noHabits")}
            description={t("habits.noHabitsSub")}
            action={
              <Button size="sm" variant="primary" onClick={() => openComposer("habit")}>
                <Plus size={15} /> Create Habit
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
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
                  <div className="flex items-center gap-3 p-3 sm:px-4">
                    <button
                      onClick={() => toggleHabit(h.id)}
                      aria-pressed={h.completions.includes(today)}
                      aria-label={h.name}
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg transition active:scale-90",
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
                      onClick={() => setExpanded(open ? null : h.id)}
                      aria-expanded={open}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="min-w-0 truncate text-sm font-semibold text-ink">{h.name}</p>
                          <StreakFlare streak={s.currentStreak} />
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[10.5px] leading-tight text-faint">
                          <span className="shrink-0">{STATS[h.stat].short}</span>
                          <span className="shrink-0">·</span>
                          <span className="shrink-0 tabular">+{h.xp} XP</span>
                          <span className="shrink-0">·</span>
                          <span className="num shrink-0">
                            {formatNumber(s.totalCompletions)} {t("habits.totalShort")}
                          </span>
                        </p>
                      </div>
                      <HabitRing rate={s.last30.rate} color={h.color} size={40} />
                      <ChevronDown
                        size={16}
                        className={cn("shrink-0 text-faint transition-transform", open && "rotate-180")}
                      />
                    </button>

                    <button
                      onClick={() => deleteHabit(h.id)}
                      aria-label={`${t("common.delete")}: ${h.name}`}
                      className="h-9 w-9 shrink-0 rounded-lg text-faint transition hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={15} className="mx-auto" />
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
                <span className="min-w-0 flex-1 break-words text-[12.5px] font-medium leading-tight text-ink">
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
      <p className="stat-label text-faint">{label}</p>
      <p className="num mt-1 break-words text-[13px] font-semibold leading-tight text-ink">{value}</p>
    </div>
  );
}

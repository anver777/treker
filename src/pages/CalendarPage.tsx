import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles, Zap } from "lucide-react";
import { useGame } from "@/store/GameContext";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/Progress";
import { daySummary, xpByDay } from "@/lib/selectors";
import { dayLabel, monthGrid, monthLabel, todayISO, weekdayLabels } from "@/lib/date";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/utils/cn";
import { useI18n } from "@/i18n";

export default function CalendarPage() {
  const { data, setJournal } = useGame();
  const today = todayISO();
  const [selected, setSelected] = useState(today);
  const { t } = useI18n();
  const [anchor, setAnchor] = useState(`${today.slice(0, 7)}-01`);

  const cells = useMemo(() => monthGrid(anchor, true), [anchor]);
  const summaryByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof daySummary>>();
    for (const c of cells) map.set(c.iso, daySummary(data, c.iso));
    return map;
  }, [cells, data]);
  const summary = useMemo(() => summaryByDay.get(selected) ?? daySummary(data, selected), [summaryByDay, selected, data]);
  const monthXp = useMemo(() => xpByDay(data.activity, 31, today).reduce((s, d) => s + d.value, 0), [data.activity, today]);

  const monthStats = useMemo(() => {
    const inMonth = cells.filter((c) => c.inMonth && c.iso <= today);
    const scores = inMonth.map((c) => daySummary(data, c.iso).score);
    const perfect = scores.filter((s) => s >= 100).length;
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { days: inMonth.length, perfect, avg };
  }, [cells, data, today]);

  const dayActivity = data.activity.filter((a) => a.createdAt.slice(0, 10) === selected);
  const journal = data.journal[selected];

  const shiftMonth = (delta: number) => {
    const [y, m] = anchor.split("-").map((n) => parseInt(n, 10));
    const d = new Date(y, m - 1 + delta, 1);
    const iso = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-01`;
    if (iso.slice(0, 7) > today.slice(0, 7)) return;
    setAnchor(iso);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile label={t("cal.xp30")} value={formatNumber(monthXp)} icon={<Zap size={15} />} />
        <StatTile label={t("cal.avgDailyScore")} value={Math.round(monthStats.avg)} hint="/ 100" tone="violet" />
        <StatTile label={t("cal.perfectDays")} value={monthStats.perfect} hint={t("cal.perfectDaysHint")} tone="warning" />
        <StatTile label={t("cal.daysTracked")} value={monthStats.days} hint={t("cal.daysTrackedHint")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title={monthLabel(anchor)}
            subtitle={t("cal.sub")}
            icon={<CalendarDays size={15} />}
            action={
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => shiftMonth(-1)}
                  aria-label={t("common.back")}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent active:scale-90"
                >
                  <ChevronLeft size={16} />
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
                  aria-label={t("common.today")}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent active:scale-90 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            }
          />
          <div className="p-3 sm:p-4">
            <div className="mb-1.5 grid grid-cols-7 gap-1 text-center">
              {weekdayLabels(true).map((l) => (
                <span key={l} className="text-[9px] font-semibold uppercase tracking-wide text-faint">
                  {l}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell) => {
                const s = daySummary(data, cell.iso);
                const isActive = cell.iso === selected;
                const intensity = Math.min(1, s.xp / 200);
                return (
                  <button
                    key={cell.iso}
                    onClick={() => setSelected(cell.iso)}
                    aria-label={t("cal.dayLabel", { date: dayLabel(cell.iso), xp: s.xp, score: s.score })}
                    className={cn(
                      "relative flex aspect-square min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border p-0.5 transition",
                      cell.inMonth ? "border-line" : "border-transparent opacity-25",
                      isActive && "border-accent ring-1 ring-accent/40",
                      !isActive && cell.inMonth && "hover:border-line-strong",
                    )}
                    style={
                      cell.inMonth && intensity > 0 && !isActive
                        ? {
                            background: `color-mix(in srgb, var(--accent) ${Math.round(6 + intensity * 16)}%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className={cn(
                        "text-[10px] font-semibold tabular leading-none",
                        cell.isToday ? "text-accent" : "text-muted",
                      )}
                    >
                      {cell.date.getDate()}
                    </span>
                    {cell.inMonth ? (
                      <span className="flex items-center gap-[2px]">
                        <Dot on={s.quests.done > 0} color="#22d3ee" />
                        <Dot on={s.habits.done > 0} color="#2fe6a4" />
                        <Dot on={s.achievements > 0} color="#f7b955" />
                        {s.xp > 0 ? (
                          <span className="text-[7px] font-bold tabular leading-none text-accent">
                            {s.xp > 999 ? "999+" : s.xp}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-faint">
              <span className="flex items-center gap-1.5">
                <Dot on color="#22d3ee" /> {t("cal.quests")}
              </span>
              <span className="flex items-center gap-1.5">
                <Dot on color="#2fe6a4" /> {t("cal.habits")}
              </span>
              <span className="flex items-center gap-1.5">
                <Dot on color="#f7b955" /> {t("cal.achievements")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-accent/25" /> {t("cal.xpIntensity")}
              </span>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={dayLabel(selected)} subtitle={t("cal.dailySummary")} icon={<Sparkles size={15} />} />
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                  {t("cal.dailyScore")}
                </p>
                <p className="text-3xl font-semibold tabular text-ink">
                  {summary.score}
                  <span className="text-sm font-normal text-faint"> / 100</span>
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">{t("cal.xpEarned")}</p>
                <p className="text-3xl font-semibold tabular text-accent">+{formatNumber(summary.xp)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <LabeledBar
                label={t("cal.quests")}
                value={`${summary.quests.done}/${summary.quests.total}`}
                pct={summary.quests.total ? (summary.quests.done / summary.quests.total) * 100 : 0}
                color="#22d3ee"
              />
              <LabeledBar
                label={t("cal.habits")}
                value={`${summary.habits.done}/${summary.habits.total}`}
                pct={summary.habits.total ? (summary.habits.done / summary.habits.total) * 100 : 0}
                color="#2fe6a4"
              />
              <div className="flex items-baseline justify-between gap-2 border-b border-line pb-2">
                <span className="shrink-0 text-[11px] text-faint">{t("dash.moneyIn")}</span>
                <span className="num min-w-0 break-words text-right text-[12.5px] font-semibold leading-tight text-accent">
                  {formatCurrency(summary.moneyIn, data.profile.currency)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-b border-line pb-2">
                <span className="shrink-0 text-[11px] text-faint">{t("dash.moneyOut")}</span>
                <span className="num min-w-0 break-words text-right text-[12.5px] font-semibold leading-tight text-danger">
                  {formatCurrency(summary.moneyOut, data.profile.currency)}
                </span>
              </div>
            </div>

            <div>
              <Slider
                label={t("dash.mood")}
                value={journal?.mood ?? 5}
                min={1}
                max={10}
                step={1}
                onChange={(v) => setJournal(selected, { mood: v })}
              />
              <p className="mt-1.5 text-[10px] text-faint">{t("cal.moodHint")}</p>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                {t("cal.activity")}
              </p>
              {dayActivity.length === 0 ? (
                <p className="rounded-xl border border-line bg-surface-2/40 p-3 text-[11px] text-faint">
                  {t("cal.nothingLogged")}
                </p>
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {dayActivity.map((a) => (
                    <li key={a.id} className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent">
                        <Icon name={a.kind === "quest" ? "flag" : a.kind === "habit" ? "check" : "sparkles"} size={12} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{a.title}</span>
                      <span className="shrink-0 text-[11px] font-semibold tabular text-accent">
                        +{formatNumber(a.xp)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      {data.activity.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays size={22} />}
            title={t("cal.calendarEmpty")}
            description={t("cal.calendarEmptySub")}
          />
        </Card>
      ) : null}
    </div>
  );
}

function Dot({ on, color }: { on: boolean; color: string }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full"
      style={{ background: on ? color : "var(--border)" }}
      aria-hidden
    />
  );
}

function LabeledBar({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="shrink-0 text-[11px] text-faint">{label}</span>
        <span className="shrink-0 text-[13px] font-semibold tabular text-ink">{value}</span>
      </div>
      <ProgressBar value={pct} color={color} height={5} />
    </div>
  );
}

import { useMemo, useState } from "react";
import { Archive, Pause, Play, Trash2 } from "lucide-react";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Form";
import { ProgressBar } from "@/components/ui/Progress";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/store/GameContext";
import { STATS } from "@/lib/stats";
import { habitCategoryColor, habitCategoryLabel } from "@/lib/stats";
import { habitStatKeys } from "@/lib/habitMatrix";
import { habitFullStats } from "@/lib/selectors";
import { monthGrid, monthLabel, todayISO, weekdayLabels } from "@/lib/date";
import { formatNumber, formatPercent } from "@/lib/format";
import { progressByWeek } from "@/lib/habitMatrix";
import { streakTierBonus } from "@/lib/xp";
import { tr } from "@/i18n";
import { cn } from "@/utils/cn";
import type { Habit } from "@/types";

/* ============================================================
   Habit details — everything about one habit, from real data
   ============================================================ */

export function HabitDetailsModal({
  habit,
  onClose,
}: {
  habit: Habit | null;
  onClose: () => void;
}) {
  const { data, setHabitStatus, pauseHabit, deleteHabit, toggleHabit } = useGame();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pauseDate, setPauseDate] = useState("");
  const [anchor, setAnchor] = useState(() => `${todayISO().slice(0, 7)}-01`);

  const stats = useMemo(
    () => (habit ? habitFullStats(habit, todayISO()) : null),
    [habit],
  );
  const weeks = useMemo(
    () => (habit ? progressByWeek([habit], anchor, todayISO()) : []),
    [habit, anchor],
  );

  if (!habit || !stats) return null;

  const today = todayISO();
  const doneToday = habit.completions.includes(today);
  const bonus = streakTierBonus(stats.currentStreak);
  const bonusAmount = Math.round(habit.xp * bonus);
  const totalWithBonus = habit.xp + bonusAmount;
  const cells = monthGrid(anchor, true);
  const set = new Set(habit.completions);
  const goal = habit.goalId ? data.goals.find((g) => g.id === habit.goalId) : null;
  const linkedQuests = data.quests.filter((q) => q.linkedHabitId === habit.id);

  const shiftMonth = (delta: number) => {
    const [y, m] = anchor.split("-").map((n) => parseInt(n, 10));
    const d = new Date(y, m - 1 + delta, 1);
    const iso = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-01`;
    if (iso.slice(0, 7) > today.slice(0, 7)) return;
    setAnchor(iso);
  };

  return (
    <>
      <Modal
        open={Boolean(habit)}
        onClose={onClose}
        title={habit.name}
        description={habit.description || tr("mx.details")}
        size="md"
      >
        <div className="space-y-4">
          {/* identity */}
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl"
              style={{ borderColor: `${habit.color}55`, background: `${habit.color}1a` }}
            >
              {habit.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
                  style={{
                    background: `${habitCategoryColor(habit.category)}1a`,
                    color: habitCategoryColor(habit.category),
                  }}
                >
                  {habitCategoryLabel(habit.category)}
                </span>
                <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
                  {tr(`freq.${habit.frequency}`)}
                </span>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]",
                    habit.status === "active"
                      ? "bg-accent/15 text-accent"
                      : habit.status === "paused"
                        ? "bg-warning/15 text-warning"
                        : "bg-line text-faint",
                  )}
                >
                  {tr(`mx.status.${habit.status}`)}
                </span>
              </div>
              <p className="mt-1.5 truncate text-[11px] text-faint">
                {tr("mx.startDate")}: {habit.startDate}
                {habit.reminder ? ` · ${tr("mx.reminder")}: ${habit.reminder}` : ""}
              </p>
            </div>
          </div>

          {/* XP breakdown */}
          <div className="grid grid-cols-3 gap-2">
            <MiniCard label={tr("mx.baseXp")} value={`+${formatNumber(habit.xp)}`} />
            <MiniCard
              label={tr("mx.streakBonus")}
              value={bonus > 0 ? `+${Math.round(bonus * 100)}%` : "—"}
              tone="warning"
            />
            <MiniCard
              label={tr("mx.totalXpShort")}
              value={`+${formatNumber(totalWithBonus)}`}
              tone="accent"
            />
          </div>

          {/* related stats */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              {tr("mx.statTrained")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {habitStatKeys(habit).map((key) => {
                const meta = STATS[key];
                return (
                  <span
                    key={key}
                    className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                    style={{ borderColor: `${meta.color}55`, color: meta.color, background: `${meta.color}14` }}
                  >
                    <Icon name={meta.icon} size={13} />
                    {meta.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* numbers */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MiniCard label={tr("habits.currentStreak")} value={`${stats.currentStreak}`} tone="warning" />
            <MiniCard label={tr("habits.bestStreak")} value={`${stats.bestStreak}`} tone="warning" />
            <MiniCard label={tr("mx.relatedStat")} value={STATS[habit.stat].short} />
            <MiniCard label={tr("mx.totalCompletions")} value={formatNumber(stats.totalCompletions)} />
            <MiniCard label={tr("mx.missedDays")} value={formatNumber(stats.missedLast30)} />
            <MiniCard label={tr("mx.xpEarned")} value={formatNumber(habit.totalXpEarned || 0)} tone="accent" />
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-muted">{tr("mx.habitCompletion")}</span>
              <span className="shrink-0 text-[11px] font-semibold tabular text-ink">
                {formatPercent(stats.rate)}
              </span>
            </div>
            <ProgressBar value={stats.rate} color={habit.color} height={6} />
            <p className="mt-1 text-[10px] text-faint">
              {formatNumber(stats.done)} / {formatNumber(stats.planned)} · {tr("mx.plannedDays")}
            </p>
          </div>

          {/* calendar history */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                {tr("mx.calendarHistory")} · {monthLabel(anchor)}
              </p>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => shiftMonth(-1)}
                  aria-label={tr("mx.prevMonth")}
                  className="h-7 w-7 rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent"
                >
                  ‹
                </button>
                <button
                  onClick={() => shiftMonth(1)}
                  disabled={anchor.slice(0, 7) >= today.slice(0, 7)}
                  aria-label={tr("mx.nextMonth")}
                  className="h-7 w-7 rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent disabled:opacity-30"
                >
                  ›
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekdayLabels(true).map((l) => (
                <span key={l} className="pb-1 text-center text-[9px] font-semibold uppercase text-faint">
                  {l.slice(0, 2)}
                </span>
              ))}
              {cells.map((c) => {
                const done = set.has(c.iso);
                const future = c.iso > today;
                return (
                  <span
                    key={c.iso}
                    title={c.iso}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-[6px] text-[9px] font-medium tabular",
                      !c.inMonth && "opacity-20",
                      c.iso === today && "ring-1 ring-accent/60",
                    )}
                    style={
                      done
                        ? { background: habit.color, color: "#04150e", fontWeight: 700 }
                        : future
                          ? { border: "1px dashed var(--border)", color: "var(--text-tertiary)" }
                          : { background: "var(--surface-hover)", color: "var(--text-tertiary)" }
                    }
                  >
                    {c.date.getDate()}
                  </span>
                );
              })}
            </div>
          </div>

          {/* weekly performance */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              {tr("mx.weeklyPerformance")}
            </p>
            <ul className="space-y-1.5">
              {weeks.map((w) => (
                <li key={w.label} className="flex min-w-0 items-center gap-2">
                  <span className="w-10 shrink-0 text-[10px] font-semibold text-muted">{w.label}</span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${Math.min(100, w.rate)}%`, background: habit.color }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right text-[10px] font-semibold tabular text-ink">
                    {w.planned > 0 ? `${Math.round(w.rate)}%` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* links */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-line bg-surface-2/40 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                {tr("mx.linkedGoal")}
              </p>
              <p className="mt-0.5 truncate text-[12px] font-medium text-ink">
                {goal ? goal.title : tr("mx.noLinks")}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-line bg-surface-2/40 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                {tr("mx.linkedQuest")}
              </p>
              <p className="mt-0.5 truncate text-[12px] font-medium text-ink">
                {linkedQuests.length > 0
                  ? linkedQuests.map((q) => q.title).join(", ")
                  : tr("mx.noLinks")}
              </p>
            </div>
          </div>

          {/* actions */}
          <div className="space-y-2 border-t border-line pt-3">
            <Button
              variant={doneToday ? "secondary" : "primary"}
              block
              onClick={() => toggleHabit(habit.id, today)}
            >
              {doneToday ? tr("quests.reopen") : tr("quests.complete")}
            </Button>

            <div className="flex flex-wrap items-end gap-2">
              <Field label={tr("mx.pauseUntil")} className="min-w-[150px] flex-1">
                <TextInput type="date" value={pauseDate} onChange={setPauseDate} />
              </Field>
              <Button
                variant="secondary"
                onClick={() => pauseHabit(habit.id, pauseDate || null)}
                disabled={!pauseDate}
              >
                <Pause size={15} />
                {tr("mx.pause")}
              </Button>
            </div>
            <p className="text-[10px] text-faint">{tr("mx.pauseHint")}</p>

            <div className="flex flex-wrap gap-2">
              {habit.status === "paused" ? (
                <Button variant="secondary" size="sm" onClick={() => pauseHabit(habit.id, null)}>
                  <Play size={14} /> {tr("mx.resume")}
                </Button>
              ) : null}
              {habit.status !== "archived" ? (
                <Button variant="secondary" size="sm" onClick={() => setHabitStatus(habit.id, "archived")}>
                  <Archive size={14} /> {tr("mx.archive")}
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setHabitStatus(habit.id, "active")}>
                  <Play size={14} /> {tr("mx.unarchive")}
                </Button>
              )}
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} /> {tr("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteHabit(habit.id);
          onClose();
        }}
        title={tr("mx.deleteConfirmTitle")}
        message={tr("mx.deleteConfirmBody", { name: habit.name })}
        confirmLabel={tr("common.delete")}
      />
    </>
  );
}

function MiniCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "warning";
}) {
  const color =
    tone === "accent" ? "text-accent" : tone === "warning" ? "text-warning" : "text-ink";
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface-2/40 p-2.5">
      <p className="line-clamp-2 text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-faint">
        {label}
      </p>
      <p className={cn("num mt-1 break-words text-[14px] font-semibold leading-tight", color)}>{value}</p>
    </div>
  );
}

import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthGrid, monthLabel, todayISO, weekdayLabels } from "@/lib/date";
import type { Habit } from "@/types";
import { cn } from "@/utils/cn";
import { tr } from "@/i18n";

type CellState = "completed" | "missed" | "future" | "empty";

export function HabitCalendar({
  habit,
  anchor,
  onAnchorChange,
}: {
  habit: Habit;
  anchor: string;
  onAnchorChange: (iso: string) => void;
}) {
  const cells = monthGrid(anchor, true);
  const labels = weekdayLabels(true);
  const set = new Set(habit.completions);
  const created = habit.createdAt.slice(0, 10);
  const today = todayISO();

  const stateOf = (iso: string, inMonth: boolean): CellState => {
    if (!inMonth) return "empty";
    if (iso > today) return "future";
    if (set.has(iso)) return "completed";
    if (iso < created) return "empty";
    return "missed";
  };

  const prevMonth = () => onAnchorChange(shift(anchor, -1));
  const nextMonth = () => {
    const next = shift(anchor, 1);
    if (next.slice(0, 7) > today.slice(0, 7)) return;
    onAnchorChange(next);
  };

  const doneInMonth = cells.filter((c) => c.inMonth && set.has(c.iso)).length;
  const planned = cells.filter((c) => c.inMonth && stateOf(c.iso, true) !== "empty" && c.iso <= today).length;

  return (
    <div className="min-w-0">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{monthLabel(anchor)}</p>
          <p className="truncate text-[10px] text-faint">
            {tr("habits.monthDone", {
              done: doneInMonth,
              planned,
              pct: planned > 0 ? Math.round((doneInMonth / planned) * 100) : 0,
            })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={prevMonth}
            aria-label={tr("common.back")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent active:scale-90"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={nextMonth}
            aria-label={tr("common.today")}
            disabled={anchor.slice(0, 7) >= today.slice(0, 7)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent hover:text-accent active:scale-90 disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {labels.map((l) => (
          <span key={l} className="pb-1 text-[9px] font-semibold uppercase tracking-wide text-faint">
            {l}
          </span>
        ))}
        {cells.map((cell) => {
          const state = stateOf(cell.iso, cell.inMonth);
          return (
            <span
              key={cell.iso}
              title={`${cell.iso} — ${state === "completed" ? tr("habits.calendar.completed") : state === "missed" ? tr("habits.calendar.missed") : tr("habits.calendar.future")}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-[6px] text-[9px] font-medium tabular",
                !cell.inMonth && "opacity-25",
                cell.isToday && "ring-1 ring-accent/60",
              )}
              style={dayStyle(state, habit.color)}
            >
              {cell.date.getDate()}
            </span>
          );
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[10px] text-faint">
        <Legend color={habit.color} label={tr("habits.calendar.completed")} filled />
        <Legend color="var(--border)" label={tr("habits.calendar.missed")} />
        <Legend color="transparent" label={tr("habits.calendar.future")} />
      </div>
    </div>
  );
}

function dayStyle(state: CellState, color: string): React.CSSProperties {
  switch (state) {
    case "completed":
      return { background: color, color: "#04150e", fontWeight: 700 };
    case "missed":
      return { background: "color-mix(in srgb, var(--surface-hover) 70%, transparent)", color: "var(--text-tertiary)" };
    case "future":
      return { background: "transparent", border: "1px dashed var(--border)", color: "var(--text-tertiary)" };
    default:
      return { background: "transparent", color: "var(--text-tertiary)" };
  }
}

function Legend({ color, label, filled }: { color: string; label: string; filled?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-[3px]"
        style={filled ? { background: color } : { background: "var(--surface-hover)", border: "1px solid var(--border)" }}
      />
      {label}
    </span>
  );
}

function shift(iso: string, delta: number): string {
  const [y, m] = iso.split("-").map((n) => parseInt(n, 10));
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-01`;
}

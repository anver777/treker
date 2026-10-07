import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import type { MatrixCell, MatrixRow } from "@/lib/habitMatrix";
import { nextStreakTier } from "@/lib/xp";
import { tr } from "@/i18n";
import { formatPercent } from "@/lib/format";
import { cn } from "@/utils/cn";

/* ============================================================
   Habit Matrix grid
   ------------------------------------------------------------
   Layout guarantees:
   - The page never scrolls horizontally. Only `.mx-scroll`
     scrolls, and the habit column is position:sticky so names
     stay visible while days scroll under it.
   - Every cell has a fixed width, so numbers can never overflow.
   ============================================================ */

const DAY_W = 34;
/** Sticky identity column — narrower on phones so more days stay visible. */
const STICKY_CLASS = "w-[164px] sm:w-[196px] lg:w-[208px]";

export function cellTitle(cell: MatrixCell, habitName: string): string {
  const state =
    cell.state === "done"
      ? tr("mx.cellDone")
      : cell.state === "missed"
        ? tr("mx.cellMissed")
        : cell.state === "paused"
          ? tr("mx.cellPaused")
          : cell.state === "future"
            ? tr("mx.cellFuture")
            : tr("mx.cellRest");
  return `${habitName} · ${cell.iso} · ${state}`;
}

export function HabitMatrixGrid({
  rows,
  days,
  weekIndexOf,
  onToggle,
  onOpenDetails,
  todayISOValue,
}: {
  rows: MatrixRow[];
  days: { iso: string; day: number; weekIndex: number }[];
  weekIndexOf: (iso: string) => number;
  onToggle: (habitId: string, iso: string) => void;
  onOpenDetails: (habitId: string) => void;
  todayISOValue: string;
}) {
  return (
    <div className="mx-scroll relative w-full overflow-x-auto overscroll-x-contain">
      <div className="min-w-max">
        {/* header */}
        <div className="flex items-end">
          <div className={`sticky left-0 z-20 shrink-0 bg-surface pr-2 ${STICKY_CLASS}`}>
            <p className="truncate pb-2 pl-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              {tr("nav.habits")}
            </p>
          </div>
          <div className="flex shrink-0">
            {days.map((d) => {
              const isToday = d.iso === todayISOValue;
              const weekend = [0, 6].includes(new Date(d.iso).getDay());
              const firstOfWeek = weekIndexOf(d.iso) !== weekIndexOf(prevISO(d.iso));
              return (
                <div
                  key={d.iso}
                  style={{ width: DAY_W, minWidth: DAY_W }}
                  className={cn(
                    "shrink-0 pb-1.5 text-center",
                    firstOfWeek && "border-l border-line",
                  )}
                >
                  <span
                    className={cn(
                      "mx-auto flex h-5 w-[26px] items-center justify-center rounded-md text-[10px] font-semibold tabular",
                      isToday
                        ? "bg-accent text-[#04150e]"
                        : weekend
                          ? "text-faint"
                          : "text-muted",
                    )}
                  >
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* rows */}
        <div className="divide-y divide-line border-t border-line">
          {rows.map((row) => (
            <HabitMatrixRow
              key={row.habit.id}
              row={row}
              days={days}
              weekIndexOf={weekIndexOf}
              onToggle={onToggle}
              onOpenDetails={onOpenDetails}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HabitMatrixRow({
  row,
  days,
  weekIndexOf,
  onToggle,
  onOpenDetails,
}: {
  row: MatrixRow;
  days: { iso: string; day: number; weekIndex: number }[];
  weekIndexOf: (iso: string) => number;
  onToggle: (habitId: string, iso: string) => void;
  onOpenDetails: (habitId: string) => void;
}) {
  const { habit, stats } = row;
  const cellMap = new Map(row.cells.map((c) => [c.iso, c]));
  const nextTier = nextStreakTier(stats.currentStreak);

  return (
    <div className="flex items-stretch">
      {/* sticky identity column */}
      <div
        className={`sticky left-0 z-10 shrink-0 border-r border-line bg-surface py-2 pr-2 ${STICKY_CLASS}`}
      >
        <button
          onClick={() => onOpenDetails(habit.id)}
          className="flex w-full min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left transition hover:bg-surface-2/70"
          aria-label={habit.name}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-base"
            style={{
              borderColor: `${habit.color}44`,
              background: habit.status === "archived" ? "transparent" : `${habit.color}18`,
              opacity: habit.status === "archived" ? 0.5 : 1,
            }}
          >
            {habit.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight",
                  habit.status === "archived" ? "text-faint line-through" : "text-ink",
                )}
              >
                {habit.name}
              </span>
              {habit.status === "paused" ? (
                <span className="shrink-0 rounded bg-warning/15 px-1 text-[9px] font-bold uppercase text-warning">
                  ‖
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
              {stats.currentStreak > 0 ? (
                <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-warning">
                  🔥<span className="tabular">{stats.currentStreak}</span>
                </span>
              ) : null}
              {habit.status === "paused" ? (
                <span className="truncate text-[10px] text-warning">{tr("mx.status.paused")}</span>
              ) : (
                <span className="shrink-0 tabular text-[10px] text-faint">
                  {stats.done}/{stats.planned}
                </span>
              )}
              <span
                className="shrink-0 tabular text-[10px] font-semibold"
                style={{ color: habit.color }}
              >
                {Math.round(stats.rate)}%
              </span>
            </span>
          </span>
        </button>
        {nextTier ? (
          <p className="mt-0.5 truncate pl-1 text-[9px] text-faint">
            {tr("mx.nextTier", { n: nextTier.days })}
          </p>
        ) : null}
      </div>

      {/* day cells */}
      <div className="flex shrink-0 items-center py-2">
        {days.map((d) => {
          const cell = cellMap.get(d.iso);
          if (!cell) return null;
          return (
            <MatrixCellButton
              key={d.iso}
              cell={cell}
              color={habit.color}
              habitId={habit.id}
              habitName={habit.name}
              xp={habit.xp}
              weekStart={weekIndexOf(d.iso) !== weekIndexOf(prevISO(d.iso))}
              onToggle={onToggle}
            />
          );
        })}
      </div>
    </div>
  );
}

function MatrixCellButton({
  cell,
  color,
  habitId,
  habitName,
  xp,
  weekStart,
  onToggle,
}: {
  cell: MatrixCell;
  color: string;
  habitId: string;
  habitName: string;
  xp: number;
  weekStart: boolean;
  onToggle: (habitId: string, iso: string) => void;
}) {
  const [burst, setBurst] = useState(0);
  const done = cell.state === "done";
  const interactive = cell.state === "done" || cell.state === "missed" || cell.state === "rest";

  const bg =
    cell.state === "done"
      ? color
      : cell.state === "missed"
        ? "color-mix(in srgb, var(--surface-hover) 85%, transparent)"
        : cell.state === "paused"
          ? "color-mix(in srgb, var(--warning) 10%, transparent)"
          : "transparent";

  return (
    <div
      style={{ width: DAY_W, minWidth: DAY_W }}
      className={cn("relative flex shrink-0 items-center justify-center", weekStart && "border-l border-line")}
    >
      <button
        onClick={() => {
          if (!interactive) return;
          onToggle(habitId, cell.iso);
          if (!done) setBurst((b) => b + 1);
        }}
        disabled={!interactive}
        title={cellTitle(cell, habitName)}
        aria-label={cellTitle(cell, habitName)}
        aria-pressed={done}
        className={cn(
          "flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border transition-all duration-150",
          interactive ? "hover:brightness-125 active:scale-[0.92]" : "cursor-default",
          cell.isToday ? "border-accent" : "border-line",
          cell.state === "future" && "opacity-40",
          cell.state === "empty" && "opacity-0",
        )}
        style={{
          background: bg,
          borderColor: done ? color : cell.isToday ? "var(--accent)" : "var(--border)",
          boxShadow: done ? `0 0 8px ${color}44` : undefined,
        }}
      >
        {done ? (
          <Check
            size={13}
            strokeWidth={3.2}
            className="anim-check text-[#04150e]"
            style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))" }}
          />
        ) : cell.state === "paused" ? (
          <span className="text-[9px] font-bold text-warning">‖</span>
        ) : null}
      </button>

      {/* particle spark */}
      <AnimatePresence>
        {burst > 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <motion.span
                key={`${burst}-${i}`}
                initial={{ opacity: 0.9, x: 0, y: 0, scale: 0.7 }}
                animate={{
                  opacity: 0,
                  x: Math.cos((i / 4) * Math.PI * 2) * 11,
                  y: Math.sin((i / 4) * Math.PI * 2) * 11,
                  scale: 1,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-1 w-1 rounded-full"
                style={{ background: color }}
              />
            ))
          : null}
      </AnimatePresence>

      {/* floating XP */}
      <AnimatePresence>
        {burst > 0 ? (
          <motion.span
            key={burst}
            initial={{ opacity: 0, scale: 0.7, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.7, 1, 1.1], y: [0, -6, -22] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            onAnimationComplete={() => setBurst(0)}
            className="pointer-events-none absolute -top-1 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold tabular"
            style={{ color, textShadow: "0 1px 6px rgba(0,0,0,0.75)" }}
          >
            +{xp} XP
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function prevISO(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d - 1);
  return `${dt.getFullYear()}-${`${dt.getMonth() + 1}`.padStart(2, "0")}-${`${dt.getDate()}`.padStart(2, "0")}`;
}

/* ---------- Legend ---------- */

export function MatrixLegend() {
  const items = [
    { label: tr("mx.cellDone"), style: { background: "var(--accent)", borderColor: "var(--accent)" } },
    { label: tr("mx.cellMissed"), style: { background: "var(--surface-hover)", borderColor: "var(--border)" } },
    { label: tr("mx.cellRest"), style: { background: "transparent", borderColor: "var(--border)" } },
    { label: tr("mx.cellFuture"), style: { background: "transparent", borderColor: "var(--border)", opacity: 0.4 } },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-faint">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[4px] border" style={i.style} />
          {i.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-[4px] border border-accent" />
        {tr("mx.today")}
      </span>
    </div>
  );
}

export function RateBadge({ rate, color }: { rate: number; color?: string }) {
  return (
    <span
      className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular"
      style={{ background: `${color || "var(--accent)"}1a`, color: color || "var(--accent)" }}
    >
      {formatPercent(rate, 1)}
    </span>
  );
}

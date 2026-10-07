import { Check } from "lucide-react";
import { motion } from "framer-motion";
import type { Habit } from "@/types";
import { STATS } from "@/lib/stats";
import { cn } from "@/utils/cn";
import { tr } from "@/i18n";

export function HabitCheckItem({
  habit,
  done,
  onToggle,
}: {
  habit: Habit;
  done: boolean;
  onToggle: () => void;
}) {
  const stat = STATS[habit.stat];
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={`${done ? tr("quests.reopen") : tr("quests.complete")} · ${habit.name}`}
        className={cn(
          "flex min-h-[52px] w-full max-w-full min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left transition-all duration-200 active:scale-[0.99]",
          done ? "border-accent/30 bg-accent/8" : "border-line bg-surface-2/40 hover:border-line-strong",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-base transition",
            done ? "border-transparent" : "border-line",
          )}
          style={done ? { background: habit.color, color: "#04150e" } : undefined}
        >
          {done ? <Check size={17} strokeWidth={3} className="anim-check" /> : habit.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-[13px] font-semibold leading-snug text-ink [overflow-wrap:break-word]",
              done && "text-muted line-through decoration-line-strong",
            )}
          >
            {habit.name}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-faint">
            <span className="shrink-0 font-semibold tabular" style={{ color: stat.color }}>
              +{habit.xp} XP
            </span>
            <span>·</span>
            <span className="truncate">{stat.short}</span>
          </span>
        </span>
      </button>
    </li>
  );
}

export function HabitRing({ rate, size = 42, color }: { rate: number; size?: number; color: string }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, rate));
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 800ms ease-out" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular text-ink">
        {Math.round(pct)}
      </span>
    </span>
  );
}

export function StreakFlare({ streak }: { streak: number }) {
  if (streak < 3) return null;
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 18 }}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/30 bg-warning/12 px-2 py-0.5 text-[10px] font-semibold text-warning"
    >
      🔥 {streak}d
    </motion.span>
  );
}

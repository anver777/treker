import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/Progress";
import { formatNumber } from "@/lib/format";
import type { StatKey } from "@/types";
import type { StatMeta } from "@/lib/stats";
import { cn } from "@/utils/cn";

export interface StatView {
  key: StatKey;
  meta: StatMeta;
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number;
}

export function StatCard({ stat, className }: { stat: StatView; className?: string }) {
  return (
    <div
      className={cn(
        "card-surface group flex min-w-0 flex-col gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5",
        className,
      )}
      style={{ boxShadow: undefined }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${stat.meta.color}1f`, color: stat.meta.color }}
        >
          <Icon name={stat.meta.icon} size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
            {stat.meta.short}
          </p>
          <p className="truncate text-xs text-faint">Level {stat.level}</p>
        </div>
        <span className="shrink-0 text-lg font-semibold tabular text-ink">{stat.level}</span>
      </div>

      <ProgressBar value={stat.progress} color={stat.meta.color} height={6} label={`${stat.meta.label} progress`} />

      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="num break-words text-[10.5px] leading-tight text-muted">
          {formatNumber(stat.xpIntoLevel)} / {formatNumber(stat.xpForNext)} XP
        </span>
        <span className="shrink-0 tabular font-semibold" style={{ color: stat.meta.color }}>
          {Math.round(stat.progress)}%
        </span>
      </div>
    </div>
  );
}

export function StatRow({ stat, onSpend, canSpend }: { stat: StatView; onSpend?: () => void; canSpend?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-line px-4 py-3 last:border-0">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${stat.meta.color}1f`, color: stat.meta.color }}
      >
        <Icon name={stat.meta.icon} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-muted">
            {stat.meta.label}
          </p>
          <p className="shrink-0 text-xs tabular text-ink">
            <span className="font-semibold">Lv {stat.level}</span>
            <span className="text-faint"> · {Math.round(stat.progress)}%</span>
          </p>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <ProgressBar value={stat.progress} color={stat.meta.color} height={5} className="min-w-0 flex-1" />
          {onSpend ? (
            <button
              onClick={onSpend}
              disabled={!canSpend}
              className="shrink-0 rounded-lg border border-accent/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent transition hover:bg-accent/15 disabled:opacity-30"
            >
              +1
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

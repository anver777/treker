import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-5 py-10 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface-2 text-accent">
        {icon}
      </div>
      <div className="max-w-xs">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-faint">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={cn("skeleton", className)} style={style} />;
}

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("card-surface p-4", className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${90 - i * 14}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card-surface p-4", className)}>
      <Skeleton className="h-3 w-28" />
      <div className="mt-4 flex h-40 items-end gap-1.5">
        {[45, 70, 35, 85, 60, 50, 75, 40, 65, 55, 80, 30].map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function Badge({
  children,
  color,
  className,
  icon,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
        className,
      )}
      style={{
        borderColor: color ? `${color}55` : "var(--border)",
        color: color || "var(--text-secondary)",
        background: color ? `${color}14` : "transparent",
      }}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5">
      <p className="min-w-0 flex-1 text-xs text-danger">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="rounded-lg border border-danger/40 px-2.5 py-1 text-xs font-medium text-danger transition hover:bg-danger/20"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export function Card({
  children,
  className,
  hover = false,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  as?: "section" | "div" | "article" | "li";
}) {
  return (
    <Tag
      className={cn(
        "card-surface relative box-border overflow-hidden",
        hover && "transition-all duration-200 hover:border-accent/30 hover:shadow-[0_0_0_1px_var(--glow)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-line px-3.5 py-3 sm:px-5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-[12px] font-semibold uppercase leading-tight tracking-[0.12em] text-muted sm:text-[13px]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 break-words text-[11px] leading-snug text-faint">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? (
        <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1.5">{action}</div>
      ) : null}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
  className,
}: {
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-baseline justify-between gap-2", className)}>
      <h2 className="text-[15px] font-semibold tracking-tight text-ink">{children}</h2>
      {hint ? <span className="text-xs text-faint">{hint}</span> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className,
  /** Spans every grid column — used to balance odd tile counts. */
  full,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "accent" | "warning" | "danger" | "violet";
  className?: string;
  full?: boolean;
}) {
  const tones: Record<string, string> = {
    default: "text-accent",
    accent: "text-accent",
    warning: "text-warning",
    danger: "text-danger",
    violet: "text-violet",
  };
  return (
    <Card
      hover
      className={cn(
        "flex min-w-0 flex-col justify-between gap-2 p-3.5 sm:p-4",
        full && "col-span-full",
        className,
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="stat-label min-w-0 flex-1 text-faint">{label}</p>
        {icon ? <span className={cn("flex shrink-0", tones[tone])}>{icon}</span> : null}
      </div>

      <p className="stat-value num m-0 w-full text-ink">{value}</p>

      {hint ? (
        <p className="m-0 w-full break-words text-[11px] leading-snug text-faint">{hint}</p>
      ) : (
        <span aria-hidden className="hidden" />
      )}
    </Card>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

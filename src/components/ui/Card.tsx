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
        "card-surface relative w-full max-w-full min-w-0 box-border overflow-hidden",
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
        "flex min-w-0 flex-wrap items-center justify-between gap-2.5 border-b border-line px-3.5 py-3 sm:px-5 sm:py-3.5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 basis-[160px] items-center gap-2.5">
        {icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-[12px] sm:text-[13px] font-semibold uppercase leading-[1.3] tracking-[0.1em] text-muted [overflow-wrap:break-word]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] sm:text-xs leading-[1.3] text-faint [overflow-wrap:break-word]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {action ? (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 sm:gap-2">
          {action}
        </div>
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
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "accent" | "warning" | "danger" | "violet";
  className?: string;
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
      className={cn(
        "flex h-full w-full max-w-full min-w-0 flex-col justify-between p-3.5 sm:p-4",
        className,
      )}
      hover
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-[10px] sm:text-[11px] font-semibold uppercase leading-[1.3] tracking-[0.06em] text-faint [overflow-wrap:break-word] [word-break:normal]">
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-2/80",
              tones[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 flex min-w-0 flex-col gap-1">
        <p className="text-[clamp(1.25rem,4vw,1.625rem)] font-bold leading-[1.15] tabular tracking-tight text-ink [overflow-wrap:anywhere]">
          {value}
        </p>
        {hint ? (
          <p className="text-[11px] sm:text-xs leading-[1.3] text-faint [overflow-wrap:break-word] [word-break:normal]">
            {hint}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

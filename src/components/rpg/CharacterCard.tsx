import { Sparkles } from "lucide-react";
import { Avatar } from "@/components/rpg/Avatar";
import { Card } from "@/components/ui/Card";
import { levelInfo, rankTitle } from "@/lib/xp";
import { compactNumber, formatNumber } from "@/lib/format";
import type { AppData } from "@/types";
import { cn } from "@/utils/cn";
import { tr } from "@/i18n";
import { titleLabel } from "@/lib/stats";

export function CharacterCard({
  data,
  lifeScore,
  onOpenProfile,
  className,
}: {
  data: AppData;
  lifeScore: number;
  onOpenProfile?: () => void;
  className?: string;
}) {
  const info = levelInfo(data.profile.totalXp);
  const size = 116;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--glow), transparent 70%)" }}
      />
      <div className="relative flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-center sm:gap-6">
        <Avatar
          src={data.profile.avatar}
          name={data.profile.name}
          size={size}
          ring={info.progress}
        />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
            {tr("dash.levelN", { n: info.level })}
          </p>
          <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            {data.profile.name || "Player"}
          </h2>
          <p className="mt-0.5 truncate text-xs text-faint">
            {rankTitle(info.level)} · {titleLabel(data.profile.title)}
          </p>

          <div className="mt-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
              <span className="shrink-0 font-medium text-muted">XP</span>
              <span className="min-w-0 truncate tabular text-ink">
                <span className="font-semibold">{formatNumber(info.xpIntoLevel)}</span>
                <span className="text-faint"> / {formatNumber(info.xpForNext)}</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${info.progress}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--accent-secondary))",
                  boxShadow: "0 0 14px var(--glow)",
                  transition: "width 900ms cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-faint">
              <span>{tr("char.xpToNext", { xp: compactNumber(info.xpRemaining), n: info.nextLevel })}</span>
              <span className="tabular">{tr("dash.totalXp", { n: compactNumber(data.profile.totalXp) })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-2 divide-line border-t border-line sm:grid-cols-4 sm:divide-x">
        <Metric label={tr("dash.lifeScore")} value={`${lifeScore}`} suffix="/ 100" />
        <Metric label={tr("dash.rank")} value={rankTitle(info.level)} />
        <Metric label={tr("dash.charPoints")} value={formatNumber(data.profile.characterPoints)} />
        <Metric
          label={tr("dash.mainGoal")}
          value={data.profile.mainGoal || "Not set"}
          truncate
          action={onOpenProfile}
        />
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  suffix,
  truncate,
  action,
}: {
  label: string;
  value: string;
  suffix?: string;
  truncate?: boolean;
  action?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={action}
      disabled={!action}
      className="flex min-w-0 flex-col items-start gap-0.5 border-line px-4 py-3 text-left transition hover:bg-surface-2/70 disabled:cursor-default sm:px-4"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
        {label}
      </span>
      <span
        className={cn(
          "flex min-w-0 items-baseline gap-1 text-sm font-semibold text-ink",
          truncate ? "w-full" : "",
        )}
      >
        <span className={truncate ? "truncate" : "tabular"}>{value}</span>
        {suffix ? <span className="shrink-0 text-[10px] font-normal text-faint">{suffix}</span> : null}
      </span>
    </button>
  );
}

export function LifeScoreCard({ score, parts }: { score: number; parts: { label: string; value: number }[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{tr("dash.lifeScore")}</p>
        <Sparkles size={14} className="text-violet" />
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-semibold tabular leading-none text-ink">{score}</span>
        <span className="pb-1 text-xs text-faint">/ 100</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full"
          style={{
            width: `${score}%`,
            background: "linear-gradient(90deg, var(--accent), var(--violet))",
            transition: "width 900ms ease-out",
          }}
        />
      </div>
      <ul className="mt-4 space-y-2">
        {parts.slice(0, 5).map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className="w-[74px] shrink-0 truncate text-[11px] text-faint">{p.label}</span>
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full bg-accent/70"
                style={{ width: `${Math.round(p.value * 100)}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

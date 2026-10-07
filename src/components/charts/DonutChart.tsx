import { useMemo, useState } from "react";
import { compactNumber, formatPercent } from "@/lib/format";
import { tr } from "@/i18n";

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  size = 168,
  thickness = 18,
  centerLabel,
  centerValue,
  unit,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  unit?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const total = useMemo(
    () => data.reduce((s, d) => s + (Number.isFinite(d.value) ? d.value : 0), 0),
    [data],
  );
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = total > 0 ? total : 1;

  let offset = 0;
  const arcs = data.map((d, i) => {
    const share = Math.max(0, d.value) / safeTotal;
    const dash = share * circumference;
    const arc = { ...d, dash, offset, share, index: i };
    offset += dash;
    return arc;
  });

  const focused = active !== null ? arcs[active] : null;

  return (
    <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={tr("an.title")}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={thickness}
          />
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={a.color}
              strokeWidth={active === a.index ? thickness + 4 : thickness}
              strokeDasharray={`${a.dash} ${circumference - a.dash}`}
              strokeDashoffset={-a.offset}
              strokeLinecap="butt"
              onMouseEnter={() => setActive(a.index)}
              onMouseLeave={() => setActive(null)}
              style={{ transition: "stroke-width 160ms ease, opacity 160ms ease" }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <span className="max-w-full truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            {focused ? focused.label : centerLabel}
          </span>
          <span className="num max-w-full break-words text-lg font-semibold leading-tight text-ink sm:text-xl">
            {focused
              ? unit
                ? `${compactNumber(focused.value)} ${unit}`
                : formatPercent(focused.share * 100, 1)
              : centerValue}
          </span>
          {focused ? (
            <span className="text-[10px] text-faint">
              {formatPercent(focused.share * 100, 1)} of total
            </span>
          ) : null}
        </div>
      </div>

      <ul className="flex w-full min-w-0 flex-col gap-1.5">
        {arcs.slice(0, 7).map((a) => (
          <li
            key={a.label}
            className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-surface-2"
            onMouseEnter={() => setActive(a.index)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: a.color }} />
            <span className="min-w-0 flex-1 truncate text-xs text-muted">{a.label}</span>
            <span className="shrink-0 text-xs font-semibold tabular text-ink">
              {formatPercent(a.share * 100, 1)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

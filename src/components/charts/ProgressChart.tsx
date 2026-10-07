import { useState } from "react";
import { useMeasure } from "@/hooks/useMeasure";
import { formatPercent } from "@/lib/format";
import { cn } from "@/utils/cn";

/* ============================================================
   Progress chart (used for "by day" and "by week")
   ------------------------------------------------------------
   Overflow safety: the svg uses a viewBox derived from the real
   measured width, all labels are clamped to the plot area, and
   the hover readout is a normal-flow line above the chart — it
   can never escape the card.
   ============================================================ */

export interface ProgressDatum {
  key: string;
  label: string;
  rate: number;
  done: number;
  planned: number;
  caption: string;
}

export function ProgressChart({
  data,
  height = 170,
  color = "var(--accent)",
  emptyLabel,
}: {
  data: ProgressDatum[];
  height?: number;
  color?: string;
  emptyLabel?: string;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const w = Math.max(240, width || 320);
  const pad = { top: 18, right: 6, bottom: 20, left: 30 };
  const innerW = Math.max(10, w - pad.left - pad.right);
  const innerH = Math.max(10, height - pad.top - pad.bottom);
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(20, slot * 0.6));
  // Labels are anchored inside their own slot, so they can never cross the axis edge
  const firstIsEdge = data.length > 0;
  const labelAnchor = (i: number): "start" | "middle" | "end" => {
    if (!firstIsEdge) return "middle";
    if (i === 0) return "start";
    if (i === data.length - 1) return "end";
    return "middle";
  };

  const activeItem = active !== null ? data[active] : null;
  const hasAny = data.some((d) => d.planned > 0);

  return (
    <div ref={ref} className="w-full min-w-0">
      <div
        className={cn(
          "mb-2 flex min-h-[34px] flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-line bg-surface-2/40 px-2.5 py-1.5 text-[11px]",
          !activeItem && "opacity-70",
        )}
      >
        {activeItem ? (
          <>
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ink">
              {activeItem.caption}
            </span>
            <span className="num shrink-0 text-[11px] text-muted">
              {activeItem.done}/{activeItem.planned}
            </span>
            <span className="num shrink-0 text-[11px] font-semibold text-accent">
              {formatPercent(activeItem.rate, 0)}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-faint">
            {hasAny ? emptyLabel || "—" : emptyLabel || "—"}
          </span>
        )}
      </div>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        role="img"
        className="block max-w-full"
      >
        {[0, 25, 50, 75, 100].map((t) => {
          const y = pad.top + innerH - (t / 100) * innerH;
          return (
            <g key={t}>
              <line
                x1={pad.left}
                x2={w - pad.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray={t === 0 ? "0" : "3 4"}
              />
              <text
                x={pad.left - 5}
                y={y + 3.5}
                textAnchor="end"
                fontSize="9"
                fill="var(--text-tertiary)"
              >
                {t}%
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const h = Math.max(0, Math.min(100, d.rate) / 100) * innerH;
          const plannedZero = d.planned === 0;
          const isActive = active === i;
          return (
            <g
              key={d.key}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onTouchStart={() => setActive(i)}
            >
              <rect
                x={cx - slot / 2}
                y={pad.top}
                width={slot}
                height={innerH}
                fill="transparent"
              />
              <rect
                x={cx - barW / 2}
                y={pad.top + innerH - h}
                width={barW}
                height={h}
                rx={Math.min(4, barW / 2)}
                fill={plannedZero ? "var(--border-strong)" : color}
                opacity={isActive ? 1 : 0.82}
                style={{ transition: "opacity 140ms ease" }}
              />
              {data.length <= 34 || i % Math.ceil(data.length / 16) === 0 ? (
                <text
                  x={Math.min(Math.max(cx, pad.left), w - pad.right)}
                  y={height - 6}
                  textAnchor={labelAnchor(i)}
                  fontSize="8.5"
                  fill="var(--text-tertiary)"
                >
                  {d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================================================
   Activity heatmap — GitHub-style, scrolls inside its own box
   ============================================================ */

export interface HeatCellData {
  iso: string;
  xp: number;
  done: number;
  planned: number;
  level: number;
}

const LEVEL_BG = [
  "var(--surface-hover)",
  "color-mix(in srgb, var(--accent) 24%, transparent)",
  "color-mix(in srgb, var(--accent) 46%, transparent)",
  "color-mix(in srgb, var(--accent) 68%, transparent)",
  "var(--accent)",
];

export function ActivityHeatmap({ columns }: { columns: HeatCellData[][] }) {
  const [hovered, setHovered] = useState<HeatCellData | null>(null);

  return (
    <div className="w-full min-w-0">
      <div className="mb-2 flex min-h-[30px] items-center gap-2 rounded-lg border border-line bg-surface-2/40 px-2.5 py-1.5 text-[11px]">
        {hovered ? (
          <>
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ink">
              {new Date(hovered.iso).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="num shrink-0 text-[11px] text-muted">{hovered.xp} XP</span>
            <span className="num shrink-0 text-[11px] text-muted">
              {hovered.done}/{hovered.planned}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-faint">
            <span className="tabular">—</span>
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto overscroll-x-contain pb-1">
        <div className="flex min-w-max gap-[3px]">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((cell) => (
                <span
                  key={cell.iso}
                  title={`${cell.iso} · ${cell.xp} XP · ${cell.done}/${cell.planned}`}
                  onMouseEnter={() => setHovered(cell)}
                  onMouseLeave={() => setHovered(null)}
                  onTouchStart={() => setHovered(cell)}
                  className="h-[11px] w-[11px] shrink-0 rounded-[3px] border border-transparent transition-transform hover:scale-125"
                  style={{
                    background: LEVEL_BG[Math.max(0, Math.min(4, cell.level))],
                    borderColor: cell.level === 0 ? "var(--border)" : "transparent",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-faint">
        <span>0 XP</span>
        {LEVEL_BG.map((bg, i) => (
          <span
            key={i}
            className="h-[10px] w-[10px] rounded-[3px] border"
            style={{ background: bg, borderColor: i === 0 ? "var(--border)" : "transparent" }}
          />
        ))}
        <span>200+ XP</span>
      </div>
    </div>
  );
}

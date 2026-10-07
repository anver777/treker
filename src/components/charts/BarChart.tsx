import { useMeasure } from "@/hooks/useMeasure";
import { compactNumber } from "@/lib/format";

export interface BarDatum {
  label: string;
  value: number;
  secondary?: number;
  color?: string;
  secondaryColor?: string;
}

export function BarChart({
  data,
  height = 190,
  color = "var(--accent)",
  secondaryColor = "var(--accent-secondary)",
  valueFormat = (v: number) => compactNumber(v),
  legend,
  ariaLabel = "Bar chart",
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
  secondaryColor?: string;
  valueFormat?: (v: number) => string;
  legend?: { primary: string; secondary?: string };
  ariaLabel?: string;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const w = Math.max(220, width || 320);
  const padLeft = 38;
  const padBottom = 22;
  const padTop = 16;
  const innerW = Math.max(10, w - padLeft - 6);
  const innerH = Math.max(10, height - padTop - padBottom);

  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.secondary || 0)));
  const niceMax = niceCeil(max);
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(4, Math.min(26, slot * (data.some((d) => d.secondary !== undefined) ? 0.32 : 0.56)));
  const labelEvery = Math.max(1, Math.ceil((data.length * 34) / Math.max(60, innerW)));

  return (
    <div ref={ref} className="w-full">
      {legend ? (
        <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
            {legend.primary}
          </span>
          {legend.secondary ? (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: secondaryColor }} />
              {legend.secondary}
            </span>
          ) : null}
        </div>
      ) : null}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        role="img"
        aria-label={ariaLabel}
        className="block max-w-full"
      >
        {[0, 0.5, 1].map((t, i) => {
          const y = padTop + innerH - t * innerH;
          return (
            <g key={i}>
              <line
                x1={padLeft}
                x2={w - 4}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray={i === 0 ? "0" : "3 4"}
              />
              <text
                x={padLeft - 6}
                y={y + 3.5}
                textAnchor="end"
                fontSize="9.5"
                fill="var(--text-tertiary)"
              >
                {valueFormat(t * niceMax)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const cx = padLeft + slot * i + slot / 2;
          const hPrimary = (d.value / niceMax) * innerH;
          const hasSecondary = d.secondary !== undefined;
          const yBase = padTop + innerH;
          return (
            <g key={`${d.label}-${i}`}>
              <rect
                x={hasSecondary ? cx - barW - 1.5 : cx - barW / 2}
                y={yBase - hPrimary}
                width={barW}
                height={Math.max(0, hPrimary)}
                rx={Math.min(5, barW / 2)}
                fill={d.color || color}
                opacity={0.92}
              />
              {hasSecondary ? (
                <rect
                  x={cx + 1.5}
                  y={yBase - (d.secondary as number) / niceMax * innerH}
                  width={barW}
                  height={Math.max(0, ((d.secondary as number) / niceMax) * innerH)}
                  rx={Math.min(5, barW / 2)}
                  fill={d.secondaryColor || secondaryColor}
                  opacity={0.85}
                />
              ) : null}
              {i % labelEvery === 0 ? (
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="9.5"
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

function niceCeil(n: number) {
  if (n <= 5) return 5;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

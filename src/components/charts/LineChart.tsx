import { useMemo } from "react";
import type { SeriesPoint } from "@/lib/selectors";
import { compactNumber } from "@/lib/format";
import { useMeasure } from "@/hooks/useMeasure";

interface Props {
  data: SeriesPoint[];
  height?: number;
  color?: string;
  colorTo?: string;
  valueFormat?: (v: number) => string;
  area?: boolean;
  ariaLabel?: string;
}

const PAD = { top: 14, right: 8, bottom: 22, left: 40 };

export function LineChart({
  data,
  height = 200,
  color = "var(--accent)",
  colorTo = "var(--accent-secondary)",
  valueFormat = (v: number) => compactNumber(v),
  area = true,
  ariaLabel = "Line chart",
}: Props) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const w = Math.max(220, width || 320);
  const h = height;
  const innerW = Math.max(10, w - PAD.left - PAD.right);
  const innerH = Math.max(10, h - PAD.top - PAD.bottom);

  const { path, areaPath, points, ticks, max } = useMemo(() => {
    const values = data.map((d) => (Number.isFinite(d.value) ? d.value : 0));
    const maxValue = Math.max(1, ...values);
    const niceMax = niceCeil(maxValue);
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;
    const y = (v: number) => innerH - (v / niceMax) * innerH;
    const pts = data.map((d, i) => ({
      x: PAD.left + i * step,
      y: PAD.top + y(Number.isFinite(d.value) ? d.value : 0),
      value: d.value,
      label: d.label,
    }));
    const d = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${round(p.x)},${round(p.y)}`)
      .join(" ");
    const a = pts.length
      ? `M${round(pts[0].x)},${round(PAD.top + innerH)} ${d.replace(/^M/, "L")} L${round(
          pts[pts.length - 1].x,
        )},${round(PAD.top + innerH)} Z`
      : "";
    const tickValues = [0, 0.5, 1].map((t) => t * niceMax);
    return {
      path: d,
      areaPath: a,
      points: pts,
      ticks: tickValues,
      max: niceMax,
    };
  }, [data, innerW, innerH]);

  const labelEvery = Math.max(1, Math.ceil((data.length * 46) / Math.max(60, innerW)));

  return (
    <div ref={ref} className="w-full">
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={ariaLabel}
        className="block max-w-full"
      >
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lc-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => {
          const y = PAD.top + innerH - (t / max) * innerH;
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={w - PAD.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray={i === 0 ? "0" : "3 4"}
              />
              <text
                x={PAD.left - 6}
                y={y + 3.5}
                textAnchor="end"
                fontSize="9.5"
                fill="var(--text-tertiary)"
              >
                {valueFormat(t)}
              </text>
            </g>
          );
        })}

        {area && areaPath ? <path d={areaPath} fill="url(#lc-fill)" /> : null}
        <path
          d={path}
          fill="none"
          stroke="url(#lc-stroke)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={i}>
            {points.length <= 32 ? (
              <circle cx={p.x} cy={p.y} r="2.6" fill="var(--surface)" stroke={color} strokeWidth="1.6" />
            ) : null}
            {i % labelEvery === 0 ? (
              <text
                x={p.x}
                y={h - 6}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                fontSize="9.5"
                fill="var(--text-tertiary)"
              >
                {p.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function niceCeil(n: number) {
  if (n <= 5) return 5;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

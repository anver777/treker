import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

/* ============================================================
   Progress indicators — animated, never overflowing
   ============================================================ */

export function ProgressBar({
  value,
  color,
  className,
  height = 8,
  showTrackGlow = true,
  label,
}: {
  value: number;
  color?: string;
  className?: string;
  height?: number;
  showTrackGlow?: boolean;
  label?: string;
}) {
  const safe = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 40);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-line", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || "progress"}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${mounted ? safe : 0}%`,
          background: color
            ? `linear-gradient(90deg, ${color}99, ${color})`
            : "linear-gradient(90deg, var(--accent), var(--accent-secondary))",
          boxShadow: showTrackGlow ? `0 0 12px ${color ? `${color}55` : "var(--glow)"}` : undefined,
        }}
      />
    </div>
  );
}

export function RadialProgress({
  value,
  size = 132,
  stroke = 9,
  color = "var(--accent)",
  trackColor = "var(--border)",
  children,
  className,
  gradientTo,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  className?: string;
  gradientTo?: string;
}) {
  const safe = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(t);
  }, []);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (mounted ? safe : 0) / 100);
  const gid = `rg-${Math.round(size)}-${Math.round(safe)}`;
  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} className="-rotate-90">
        {gradientTo ? (
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={gradientTo} />
            </linearGradient>
          </defs>
        ) : null}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gradientTo ? `url(#${gid})` : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)",
            filter: `drop-shadow(0 0 6px ${gradientTo ? "var(--glow)" : "transparent"})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

export function XPPill({ xp, className }: { xp: number; className?: string }) {
  const positive = xp > 0;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular",
        positive
          ? "bg-accent/12 text-accent"
          : xp < 0
            ? "bg-danger/12 text-danger"
            : "bg-line text-faint",
        className,
      )}
    >
      {positive ? "+" : ""}
      {Math.round(xp)} XP
    </span>
  );
}

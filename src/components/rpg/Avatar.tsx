import { initials } from "@/lib/format";
import { cn } from "@/utils/cn";

export function Avatar({
  src,
  name,
  size = 64,
  className,
  ring,
  ringColor = "var(--accent)",
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  ring?: number;
  ringColor?: string;
}) {
  const inner = (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent/25 to-accent-2/20 text-center",
        className,
      )}
      style={{ fontSize: Math.max(11, size * 0.32) }}
    >
      {src ? (
        <img
          src={src}
          alt={name || "Avatar"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="font-semibold tracking-wide text-ink">
          {initials(name || "Player")}
        </span>
      )}
    </div>
  );

  if (ring === undefined) {
    return (
      <div className="shrink-0 rounded-full" style={{ width: size, height: size }}>
        {inner}
      </div>
    );
  }

  const stroke = Math.max(3, size * 0.055);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, ring));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div
        className="absolute rounded-full"
        style={{ inset: stroke + 2 }}
      >
        {inner}
      </div>
    </div>
  );
}

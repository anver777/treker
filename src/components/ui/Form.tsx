import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

const inputBase =
  "w-full min-w-0 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition focus:border-accent focus:bg-surface-3 disabled:opacity-50";

export function Field({
  label,
  hint,
  error,
  children,
  className,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="stat-label mb-1.5 flex items-start gap-1 text-muted">
        {label}
        {required ? <span className="text-accent">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block break-words text-xs leading-snug text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block break-words text-xs leading-snug text-faint">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
  maxLength,
  invalid,
  className,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "date" | "time";
  min?: number;
  max?: number;
  maxLength?: number;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputBase, "tabular", invalid && "border-danger/60", className)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength = 400,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputBase, "resize-none leading-relaxed")}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(inputBase, "appearance-none bg-[length:16px] pr-8")}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a97a8' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-surface text-ink">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Chips<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; color?: string }[];
  className?: string;
}): React.JSX.Element {
  return (
    <div
      role="tablist"
      className={cn("flex w-full gap-1.5 overflow-x-auto no-scrollbar pb-0.5", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95",
              active
                ? "border-transparent text-[#04150e]"
                : "border-line text-muted hover:border-line-strong hover:text-ink",
            )}
            style={
              active
                ? { background: o.color || "var(--accent)" }
                : undefined
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full min-h-[44px] items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-left transition hover:border-line-strong"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="block truncate text-xs text-faint">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 5,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {label}
        </span>
        <span className="text-sm font-semibold tabular text-accent">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        aria-label={label}
      />
    </div>
  );
}

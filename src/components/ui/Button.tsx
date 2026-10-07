import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-[#04150e] hover:brightness-110 active:brightness-95 shadow-[0_6px_24px_-8px_var(--glow)] font-semibold",
  secondary:
    "bg-surface-3 text-ink hover:bg-surface-2 border border-line-strong/70",
  ghost: "text-muted hover:text-ink hover:bg-surface-2",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
  outline: "border border-line-strong text-ink hover:border-accent hover:text-accent",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px] gap-1.5 rounded-[10px]",
  md: "h-11 px-4 text-sm gap-2 rounded-xl min-h-[44px]",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl min-h-[48px]",
  icon: "h-11 w-11 rounded-xl min-h-[44px] min-w-[44px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
  block?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  block,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium",
        "transition-all duration-150 ease-out active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonProps & { label: string }) {
  return (
    <Button
      {...rest}
      size="icon"
      aria-label={label}
      title={label}
      className={cn("shrink-0", className)}
    >
      {children}
    </Button>
  );
}

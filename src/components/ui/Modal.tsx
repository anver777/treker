import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { tr } from "@/i18n";
import { cn } from "@/utils/cn";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    }, 90);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const widths = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl" };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative z-10 mx-auto flex max-h-[92dvh] w-full max-w-full flex-col overflow-hidden rounded-t-[20px] border border-line bg-surface shadow-2xl sm:rounded-[20px]",
              widths[size],
            )}
          >
            <header className="flex shrink-0 items-start justify-between gap-x-3 gap-y-2 px-3.5 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-base font-semibold leading-tight tracking-tight text-ink">{title}</h2>
                {description ? (
                  <p className="mt-1 break-words text-xs leading-relaxed text-faint">{description}</p>
                ) : null}
              </div>
              <IconButton label={tr("common.close")} variant="ghost" size="sm" onClick={onClose}>
                <X size={18} />
              </IconButton>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-4 sm:px-5">{children}</div>
            {footer ? (
              <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2/60 px-3.5 py-3 pb-safe sm:px-5">
                {footer}
              </footer>
            ) : (
              <div className="pb-safe" />
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm leading-relaxed text-muted">{message}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          onClick={onClose}
          className="h-11 min-h-[44px] rounded-xl border border-line px-4 text-sm text-muted transition hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={
            danger
              ? "h-11 min-h-[44px] rounded-xl bg-danger px-4 text-sm font-semibold text-[#2a0710] transition active:scale-95"
              : "h-11 min-h-[44px] rounded-xl bg-accent px-4 text-sm font-semibold text-[#04150e] transition active:scale-95"
          }
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

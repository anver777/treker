import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Trash2, X } from "lucide-react";
import { timeAgo } from "@/lib/date";
import { useGame } from "@/store/GameContext";
import { IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { tr } from "@/i18n";

export function NotificationCenter() {
  const { data, readNotifications, deleteNotification, clearNotifications } = useGame();
  const [open, setOpen] = useState(false);
  const unread = data.notifications.filter((n) => !n.read).length;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) window.setTimeout(readNotifications, 1400);
        }}
        aria-label={unread > 0 ? tr("fx.unread", { n: unread }) : tr("fx.notifications")}
        aria-expanded={open}
        className="relative flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2/60 text-muted transition hover:text-ink"
      >
        <Bell size={17} className="shrink-0" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-[#04150e] shadow-sm">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-[52px] z-[61] w-[min(90vw,340px)] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
              role="dialog"
              aria-label={tr("fx.notifications")}
            >
              <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {tr("fx.notifications")}
                </p>
                <div className="flex items-center gap-1">
                  {data.notifications.length > 0 ? (
                    <IconButton label={tr("fx.clearAll")} variant="ghost" size="sm" onClick={clearNotifications}>
                      <Trash2 size={15} />
                    </IconButton>
                  ) : null}
                  <IconButton label={tr("fx.closeNotifications")} variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    <X size={16} />
                  </IconButton>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {data.notifications.length === 0 ? (
                  <EmptyState
                    icon={<Bell size={22} />}
                    title={tr("fx.nothingHere")}
                    description={tr("fx.nothingHereSub")}
                    className="py-8"
                  />
                ) : (
                  <ul>
                    {data.notifications.slice(0, 20).map((n) => (
                      <li
                        key={n.id}
                        className="flex items-start gap-2.5 border-b border-line px-3 py-2.5 last:border-0"
                      >
                        <span
                          className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                            n.read ? "bg-line-strong" : "bg-accent"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-ink">{n.title}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-faint">{n.body}</p>
                          <p className="mt-1 text-[10px] text-faint">{timeAgo(n.createdAt)}</p>
                        </div>
                        <button
                          onClick={() => deleteNotification(n.id)}
                          aria-label={tr("fx.deleteNotification")}
                          className="shrink-0 rounded-lg p-1 text-faint transition hover:text-danger"
                        >
                          <X size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

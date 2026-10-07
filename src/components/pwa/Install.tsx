import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useInstall, dismissInstall, isInstallDismissed } from "@/hooks/useInstall";
import { useI18n } from "@/i18n";
import { cn } from "@/utils/cn";

const ASSET = (name: string) => `./icons/${name}`;

/* ============================================================
   Install surfaces
   ------------------------------------------------------------
   - InstallBanner: quiet floating card after a delay (never on
     the very first impression), dismissible and remembered.
   - InstallCard: persistent section used in Settings.
   Both handle the iOS "Add to Home Screen" guide.
   ============================================================ */

function useIosSheet() {
  const [open, setOpen] = useState(false);
  return { open, show: () => setOpen(true), close: () => setOpen(false) };
}

export function IosSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const steps = [
    { icon: Share, text: t("pwa.iosStep1") },
    { icon: Smartphone, text: t("pwa.iosStep2") },
    { icon: Check, text: t("pwa.iosStep3") },
  ];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("pwa.iosTitle")}
      description={t("pwa.iosOpen")}
      size="sm"
    >
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex min-w-0 items-start gap-3 rounded-xl border border-line bg-surface-2/40 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent">
              <s.icon size={15} />
            </span>
            <span className="min-w-0 flex-1 break-words text-[13px] leading-snug text-ink">
              {s.text}
            </span>
            <span className="shrink-0 text-[11px] font-bold tabular text-faint">0{i + 1}</span>
          </li>
        ))}
      </ol>
      <Button block variant="primary" className="mt-4" onClick={onClose}>
        {t("pwa.close")}
      </Button>
    </Modal>
  );
}

export function InstallBanner() {
  const { t } = useI18n();
  const { state, install, standalone } = useInstall();
  const [visible, setVisible] = useState(false);
  const sheet = useIosSheet();

  useEffect(() => {
    if (standalone || isInstallDismissed()) return;
    if (state !== "available" && state !== "ios") return;
    const timer = window.setTimeout(() => setVisible(true), 4200);
    return () => window.clearTimeout(timer);
  }, [state, standalone]);

  if (standalone || !visible) return null;

  const handle = async () => {
    if (state === "ios") {
      sheet.show();
      return;
    }
    const outcome = await install();
    if (outcome !== "accepted") return;
  };

  return (
    <>
      <AnimatePresence>
        {visible ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-3 z-[55] mx-auto max-w-[420px]"
            style={{
              bottom:
                "calc(env(safe-area-inset-bottom, 0px) + var(--bottom-nav-h) + var(--fab-gap) + var(--fab-h) + 12px)",
            }}
            role="dialog"
            aria-label={t("pwa.title")}
          >
            <div className="card-surface relative overflow-hidden p-3.5">
              <button
                onClick={() => {
                  dismissInstall();
                  setVisible(false);
                }}
                aria-label={t("pwa.notNow")}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:text-ink"
              >
                <X size={15} />
              </button>

              <div className="flex min-w-0 items-start gap-3 pr-8">
                <img
                  src={ASSET("icon-96.png")}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 shrink-0 rounded-[12px] shadow-[0_4px_14px_-6px_var(--glow)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[13px] font-semibold leading-tight text-ink">
                    {t("pwa.title")}
                  </p>
                  <p className="mt-0.5 break-words text-[11px] leading-snug text-faint">
                    {t("pwa.subtitle")}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="primary" className="flex-1" onClick={handle}>
                  <Download size={15} />
                  {state === "ios" ? t("pwa.getStarted") : t("pwa.install")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    dismissInstall();
                    setVisible(false);
                  }}
                >
                  {t("pwa.notNow")}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <IosSheet open={sheet.open} onClose={sheet.close} />
    </>
  );
}

export function InstallCard({ className }: { className?: string }) {
  const { t } = useI18n();
  const { state, install, standalone } = useInstall();
  const sheet = useIosSheet();

  const statusLabel =
    standalone || state === "installed"
      ? t("pwa.statusInstalled")
      : state === "available"
        ? t("pwa.statusAvailable")
        : state === "ios"
          ? t("pwa.statusIos")
          : t("pwa.statusUnsupported");

  const done = standalone || state === "installed";

  return (
    <section className={cn("card-surface overflow-hidden", className)}>
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-line px-3.5 py-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
            <Download size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-[12px] font-semibold uppercase leading-tight tracking-[0.12em] text-muted sm:text-[13px]">
              {t("pwa.settingsTitle")}
            </h2>
            <p className="mt-0.5 break-words text-[11px] leading-snug text-faint">
              {t("pwa.settingsSub")}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
            done
              ? "border-accent/40 bg-accent/10 text-accent"
              : state === "available"
                ? "border-violet/40 bg-violet/10 text-violet"
                : "border-line bg-surface-2 text-faint",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", done ? "bg-accent" : "bg-violet")} />
          {statusLabel}
        </span>
      </header>

      <div className="space-y-3 p-3.5 sm:p-4">
        <ul className="grid gap-2 sm:grid-cols-3">
          {[
            { icon: Smartphone, text: t("pwa.benefit3") },
            { icon: Download, text: t("pwa.benefit2") },
            { icon: Check, text: t("pwa.benefit1") },
          ].map((b, i) => (
            <li
              key={i}
              className="flex min-w-0 items-start gap-2 rounded-xl border border-line bg-surface-2/40 p-2.5"
            >
              <b.icon size={14} className="mt-0.5 shrink-0 text-accent" />
              <span className="min-w-0 break-words text-[11px] leading-snug text-muted">{b.text}</span>
            </li>
          ))}
        </ul>

        {done ? (
          <p className="flex items-start gap-2 rounded-xl border border-accent/25 bg-accent/8 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
            <Check size={14} className="mt-0.5 shrink-0 text-accent" />
            <span className="min-w-0">{t("pwa.installedSub")}</span>
          </p>
        ) : (
          <Button
            block
            variant="primary"
            onClick={async () => {
              if (state === "ios") sheet.show();
              else await install();
            }}
          >
            <Download size={15} />
            {state === "ios" ? t("pwa.getStarted") : t("pwa.install")}
          </Button>
        )}

        <p className="text-[10px] leading-relaxed text-faint">{t("pwa.offlineSub")}</p>
      </div>
      <IosSheet open={sheet.open} onClose={sheet.close} />
    </section>
  );
}

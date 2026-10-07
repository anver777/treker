import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Download,
  HardDrive,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  WifiOff,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { tr, useI18n } from "@/i18n";
import { cn } from "@/utils/cn";
import { dismissBanner, isBannerDismissed, promptInstall, usePwa } from "@/pwa/pwa";

/* ---------- Install banner (dashboard) ---------- */

export function InstallBanner() {
  const pwa = usePwa();
  useI18n();
  const [hidden, setHidden] = useState(isBannerDismissed);
  const [guideOpen, setGuideOpen] = useState(false);

  const eligible = !pwa.standalone && !pwa.installed && (pwa.canInstall || pwa.ios || pwa.android);
  if (!eligible || hidden) {
    return <InstallGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />;
  }

  const onInstall = async () => {
    if (pwa.canInstall) {
      await promptInstall();
    } else {
      setGuideOpen(true);
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="card-surface relative flex min-w-0 flex-wrap items-center gap-3 overflow-hidden p-3.5 sm:p-4"
          style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)" }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-50 blur-2xl"
            style={{ background: "radial-gradient(circle, var(--glow), transparent 70%)" }}
          />
          <img
            src="/icons/icon-192.png"
            alt=""
            width={44}
            height={44}
            className="relative h-11 w-11 shrink-0 rounded-xl"
          />
          <div className="relative min-w-0 flex-1 basis-[180px]">
            <p className="text-[14px] font-semibold leading-snug text-ink">{tr("pwa.bannerTitle")}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-faint">{tr("pwa.bannerText")}</p>
          </div>
          <div className="relative flex shrink-0 items-center gap-2">
            <Button size="sm" variant="primary" onClick={onInstall}>
              <Download size={15} className="shrink-0" />
              {pwa.canInstall ? tr("pwa.install") : tr("pwa.howTo")}
            </Button>
            <button
              type="button"
              onClick={() => {
                dismissBanner();
                setHidden(true);
              }}
              aria-label={tr("pwa.dismiss")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-faint transition hover:bg-surface-2 hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
      <InstallGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}

/* ---------- Step-by-step guide ---------- */

function Step({ n, icon, text }: { n: number; icon: React.ReactNode; text: string }) {
  return (
    <li className="flex min-w-0 items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[12px] font-bold text-accent">
        {n}
      </span>
      <span className="flex min-w-0 flex-1 items-start gap-2 pt-0.5">
        <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
        <span className="min-w-0 text-[13px] leading-relaxed text-ink">{text}</span>
      </span>
    </li>
  );
}

export function InstallGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pwa = usePwa();
  useI18n();
  const [tab, setTab] = useState<"ios" | "android">(pwa.ios ? "ios" : "android");

  return (
    <Modal open={open} onClose={onClose} title={tr("pwa.guideTitle")} description={tr("pwa.bannerText")} size="sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2/60 p-1">
          {(["ios", "android"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={cn(
                "h-10 rounded-lg text-[12px] font-semibold transition",
                tab === key ? "bg-accent text-[#04150e]" : "text-muted hover:text-ink",
              )}
            >
              {key === "ios" ? "iPhone / iPad" : "Android"}
            </button>
          ))}
        </div>

        {tab === "ios" ? (
          <>
            <ol className="space-y-3">
              <Step n={1} icon={<Share size={16} />} text={tr("pwa.iosStep1")} />
              <Step n={2} icon={<PlusSquare size={16} />} text={tr("pwa.iosStep2")} />
              <Step n={3} icon={<CheckCircle2 size={16} />} text={tr("pwa.iosStep3")} />
            </ol>
            <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
              {tr("pwa.iosNote")}
            </p>
          </>
        ) : (
          <>
            <ol className="space-y-3">
              <Step n={1} icon={<MoreVertical size={16} />} text={tr("pwa.androidStep1")} />
              <Step n={2} icon={<Download size={16} />} text={tr("pwa.androidStep2")} />
              <Step n={3} icon={<CheckCircle2 size={16} />} text={tr("pwa.androidStep3")} />
            </ol>
            {pwa.canInstall ? (
              <Button
                variant="primary"
                block
                onClick={async () => {
                  await promptInstall();
                  onClose();
                }}
              >
                <Download size={16} /> {tr("pwa.install")}
              </Button>
            ) : null}
          </>
        )}

        <p className="text-[11px] leading-relaxed text-faint">{tr("pwa.dataNote")}</p>
        <Button variant="secondary" block onClick={onClose}>
          {tr("pwa.close")}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------- Offline strip ---------- */

export function OfflineBanner() {
  const pwa = usePwa();
  useI18n();
  return (
    <AnimatePresence>
      {!pwa.online ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden border-b border-warning/30 bg-warning/10"
          role="status"
        >
          <p className="flex items-center gap-2 px-3.5 py-2 text-[11px] leading-snug text-warning sm:px-5">
            <WifiOff size={14} className="shrink-0" />
            <span className="min-w-0">{tr("pwa.offlineBanner")}</span>
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ---------- Settings card ---------- */

function StatusRow({ ok, icon, text }: { ok: boolean; icon: React.ReactNode; text: string }) {
  return (
    <li className="flex min-w-0 items-start gap-2.5 rounded-xl border border-line bg-surface-2/40 px-3 py-2.5">
      <span className={cn("mt-0.5 shrink-0", ok ? "text-accent" : "text-faint")}>{icon}</span>
      <span className="min-w-0 flex-1 text-[12px] leading-relaxed text-ink">{text}</span>
    </li>
  );
}

export function AppInstallCard() {
  const pwa = usePwa();
  useI18n();
  const [guideOpen, setGuideOpen] = useState(false);
  const isApp = pwa.standalone || pwa.installed;

  return (
    <Card>
      <CardHeader title={tr("pwa.settingsTitle")} subtitle={tr("pwa.settingsSub")} icon={<Smartphone size={15} />} />
      <div className="space-y-3 p-4">
        <ul className="space-y-2">
          <StatusRow
            ok={isApp}
            icon={<Smartphone size={15} />}
            text={
              isApp
                ? tr("pwa.statusInstalled")
                : pwa.canInstall
                  ? tr("pwa.statusReady")
                  : tr("pwa.statusManual")
            }
          />
          <StatusRow
            ok={pwa.offlineReady}
            icon={<WifiOff size={15} />}
            text={pwa.offlineReady ? tr("pwa.offlineReady") : tr("pwa.offlinePending")}
          />
          <StatusRow
            ok={pwa.persisted}
            icon={<HardDrive size={15} />}
            text={pwa.persisted ? tr("pwa.persistOn") : tr("pwa.persistOff")}
          />
        </ul>

        {!isApp ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {pwa.canInstall ? (
              <Button variant="primary" onClick={() => promptInstall()}>
                <Download size={15} /> {tr("pwa.install")}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setGuideOpen(true)} className={pwa.canInstall ? "" : "sm:col-span-2"}>
              <Smartphone size={15} /> {tr("pwa.howTo")}
            </Button>
          </div>
        ) : null}

        <p className="text-[11px] leading-relaxed text-faint">{tr("pwa.dataNote")}</p>
      </div>
      <InstallGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </Card>
  );
}

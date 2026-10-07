import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, Zap } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { STATS } from "@/lib/stats";
import { useGame } from "@/store/GameContext";
import { formatNumber } from "@/lib/format";
import { tr } from "@/i18n";

/* ============================================================
   All game feedback in one place: XP gains, stat level ups,
   level up celebration and achievement unlocks.
   ============================================================ */

export function GameFX() {
  const { ui, data, dismissXp, dismissStatUp, dismissLevelUp, dismissAchievement } = useGame();
  const enabled = data.settings.xpToasts;

  useEffect(() => {
    if (ui.xpGains.length === 0) return;
    const timers = ui.xpGains.map((g) => window.setTimeout(() => dismissXp(g.id), 2600));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [ui.xpGains, dismissXp]);

  useEffect(() => {
    if (ui.statLevelUps.length === 0) return;
    const timers = ui.statLevelUps.map((s) => window.setTimeout(() => dismissStatUp(s.id), 2800));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [ui.statLevelUps, dismissStatUp]);

  useEffect(() => {
    if (!ui.levelUp) return;
    const t = window.setTimeout(dismissLevelUp, 6000);
    return () => window.clearTimeout(t);
  }, [ui.levelUp, dismissLevelUp]);

  const achievement = ui.achievementUnlocks[0];

  return (
    <>
      {/* XP gain toasts */}
      <div className="fx-toast-top pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-5 sm:items-end">
        <AnimatePresence>
          {enabled
            ? ui.xpGains.map((g) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: -14, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  transition={{ duration: 0.24 }}
                  className="flex max-w-full items-center gap-2 rounded-full border border-accent/30 bg-surface/90 px-3 py-1.5 shadow-[0_8px_30px_-12px_var(--glow)] backdrop-blur"
                >
                  <Zap size={14} className="shrink-0 text-accent" />
                  <span className="text-sm font-semibold tabular text-accent">
                    +{formatNumber(g.amount)} XP
                  </span>
                  {g.stat ? (
                    <span className="max-w-[42vw] truncate text-[11px] text-muted sm:max-w-[220px]">
                      {g.label}
                    </span>
                  ) : (
                    <span className="max-w-[42vw] truncate text-[11px] text-muted sm:max-w-[220px]">
                      {g.label}
                    </span>
                  )}
                </motion.div>
              ))
            : null}
        </AnimatePresence>
      </div>

      {/* Stat level up toasts */}
      <div className="fx-toast-bottom pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-3 sm:left-6 sm:items-start">
        <AnimatePresence>
          {ui.statLevelUps.map((s) => {
            const meta = STATS[s.stat];
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.28 }}
                className="flex max-w-full items-center gap-2.5 rounded-2xl border px-3 py-2 backdrop-blur"
                style={{
                  borderColor: `${meta.color}55`,
                  background: `color-mix(in srgb, var(--surface) 88%, transparent)`,
                  boxShadow: `0 10px 30px -14px ${meta.color}55`,
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${meta.color}22`, color: meta.color }}
                >
                  <Icon name={meta.icon} size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">
                    {meta.short} +1
                  </span>
                  <span className="block truncate text-[11px] text-faint">
                    {tr("fx.statNow", { stat: meta.label, n: s.level })}
                  </span>
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Level up */}
      <AnimatePresence>
        {data.settings.levelUpAnimation && ui.levelUp ? (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <Particles />
            <motion.div
              initial={{ scale: 0.86, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-[24px] border border-accent/30 bg-surface/95 p-6 text-center shadow-[0_0_60px_-10px_var(--glow)]"
            >
              <div
                className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-70 blur-3xl"
                style={{ background: "radial-gradient(circle, var(--glow), transparent 70%)" }}
              />
              <p className="relative text-[11px] font-semibold uppercase tracking-[0.34em] text-accent">
                {tr("fx.levelUp")}
              </p>
              <h2 className="relative mt-3 bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-5xl font-bold tabular text-transparent">
                {ui.levelUp.to}
              </h2>
              <p className="relative mt-2 text-sm text-muted">
                {tr("fx.levelChange", { a: ui.levelUp.from, b: ui.levelUp.to })}
              </p>

              <div className="relative mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-line bg-surface-2/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-faint">{tr("fx.reward")}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {tr("fx.characterPoint", { n: ui.levelUp.characterPoint })}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-surface-2/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-faint">{tr("fx.perk")}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {tr("fx.multiplier", { n: Math.round(ui.levelUp.multiplierBonus * 100) })}
                  </p>
                </div>
              </div>

              <button
                onClick={dismissLevelUp}
                className="relative mt-5 h-11 w-full rounded-xl bg-accent text-sm font-semibold text-[#04150e] transition active:scale-95"
              >
                {tr("fx.continue")}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Achievement unlocked */}
      <AnimatePresence>
        {data.settings.achievementPopups && achievement ? (
          <motion.div
            className="fixed inset-0 z-[85] flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={dismissAchievement} />
            <motion.div
              initial={{ scale: 0.85, opacity: 0, rotateX: -12 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-xs overflow-hidden rounded-[22px] border border-warning/40 bg-surface/95 p-6 text-center shadow-[0_0_50px_-14px_rgba(247,185,85,0.5)]"
            >
              <div className="anim-glow mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-warning/40 bg-warning/10 text-warning">
                <Trophy size={30} strokeWidth={1.6} />
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-warning">
                {tr("fx.achievementUnlocked")}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-ink">{achievement.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{achievement.description}</p>
              <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-accent/12 px-3 py-1 text-xs font-semibold text-accent">
                +{achievement.xp} XP
              </p>
              <button
                onClick={dismissAchievement}
                className="mt-5 h-11 w-full rounded-xl border border-line-strong text-sm font-medium text-ink transition hover:border-warning/60 active:scale-95"
              >
                {tr("fx.nice")}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Particles() {
  const items = Array.from({ length: 18 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((_, i) => {
        const dx = (i % 2 === 0 ? -1 : 1) * (20 + ((i * 37) % 90));
        const dy = -80 - ((i * 53) % 160);
        return (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{
              left: `${8 + ((i * 29) % 84)}%`,
              top: `${45 + ((i * 17) % 40)}%`,
              background: i % 3 === 0 ? "var(--accent-secondary)" : "var(--accent)",
              ["--dx" as string]: `${dx}px`,
              ["--dy" as string]: `${dy}px`,
              animation: `lr-particle ${1.6 + (i % 5) * 0.3}s ease-out ${i * 0.07}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

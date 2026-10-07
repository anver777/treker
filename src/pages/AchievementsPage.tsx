import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Trophy } from "lucide-react";
import { useGame } from "@/store/GameContext";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Chips } from "@/components/ui/Form";
import { ProgressBar, RadialProgress } from "@/components/ui/Progress";
import { Icon } from "@/components/ui/Icon";
import { ACHIEVEMENTS, RARITY_STYLES, achievementProgress } from "@/lib/achievements";
import { metricsContext } from "@/lib/selectors";
import { formatNumber, formatPercent } from "@/lib/format";
import { todayISO } from "@/lib/date";
import { dateLocale, useI18n } from "@/i18n";

type Filter = "all" | "unlocked" | "locked";

export default function AchievementsPage() {
  const { data } = useGame();
  const [filter, setFilter] = useState<Filter>("all");
  const { t } = useI18n();
  const today = todayISO();
  const metrics = useMemo(() => metricsContext(data, today), [data, today]);

  const unlocked = ACHIEVEMENTS.filter((a) => data.achievements[a.id]?.unlockedAt);
  const locked = ACHIEVEMENTS.filter((a) => !data.achievements[a.id]?.unlockedAt);
  const xpFromAchievements = unlocked.reduce((s, a) => s + a.xp, 0);
  const rarest =
    unlocked.length > 0
      ? unlocked.reduce((best, a) =>
          RARITY_STYLES[a.rarity].label === "Legendary" ? a : best,
        )
      : null;

  const list = ACHIEVEMENTS.filter((a) => {
    if (filter === "unlocked") return Boolean(data.achievements[a.id]?.unlockedAt);
    if (filter === "locked") return !data.achievements[a.id]?.unlockedAt;
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile
          label={t("ach.unlocked")}
          value={`${unlocked.length}/${ACHIEVEMENTS.length}`}
          hint={formatPercent((unlocked.length / ACHIEVEMENTS.length) * 100, 0)}
          icon={<Trophy size={15} />}
          tone="warning"
        />
        <StatTile label={t("common.locked")} value={locked.length} hint={t("ach.keepPlaying")} />
        <StatTile label={t("ach.xpFromTrophies")} value={formatNumber(xpFromAchievements)} tone="violet" />
        <StatTile
          label={t("ach.rarest")}
          value={rarest ? t(`ach.${rarest.id}.title`) : "—"}
          hint={rarest ? RARITY_STYLES[rarest.rarity].label : t("ach.rarestEmpty")}
        />
      </div>

      <Card>
        <CardHeader
          title={t("nav.achievements")}
          subtitle={t("ach.sub")}
          icon={<Trophy size={15} />}
          action={
            <div className="hidden sm:block">
              <RadialProgress
                value={(unlocked.length / ACHIEVEMENTS.length) * 100}
                size={54}
                stroke={5}
                color="var(--warning)"
              >
                <span className="text-[10px] font-semibold tabular text-ink">
                  {Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)}%
                </span>
              </RadialProgress>
            </div>
          }
        />
        <div className="border-b border-line px-3 py-3 sm:px-4">
          <Chips
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("ach.all", { n: ACHIEVEMENTS.length }) },
              { value: "unlocked", label: t("ach.unlockedFilter", { n: unlocked.length }) },
              { value: "locked", label: t("ach.lockedFilter", { n: locked.length }) },
            ]}
          />
        </div>

        <ul className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
          {list.map((a, i) => {
            const state = data.achievements[a.id];
            const isUnlocked = Boolean(state?.unlockedAt);
            const rarity = RARITY_STYLES[a.rarity];
            const prog = achievementProgress(a, data, metrics);
            return (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                className={`card-surface flex min-w-0 flex-col gap-3 p-4 ${
                  isUnlocked ? "" : "opacity-70"
                }`}
                style={
                  isUnlocked
                    ? { borderColor: `${rarity.color}55`, boxShadow: `0 0 0 1px ${rarity.color}22, 0 12px 30px -18px ${rarity.color}` }
                    : undefined
                }
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                      isUnlocked ? "anim-glow" : ""
                    }`}
                    style={{
                      borderColor: isUnlocked ? `${rarity.color}66` : "var(--border)",
                      background: isUnlocked ? `${rarity.color}1a` : "var(--surface-hover)",
                      color: isUnlocked ? rarity.color : "var(--text-tertiary)",
                    }}
                  >
                    {isUnlocked ? <Icon name={a.icon} size={20} /> : <Lock size={17} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{t(`ach.${a.id}.title`)}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-faint">{a.id === "scholar" || a.id === "iron_body" ? t(`ach.${a.id}.desc`, { stat: a.id === "scholar" ? "Knowledge" : "Strength" }) : t(`ach.${a.id}.desc`)}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
                    style={{ background: `${rarity.color}1a`, color: rarity.color }}
                  >
                    {rarity.label}
                  </span>
                </div>

                {isUnlocked ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] text-faint">
                      {t("ach.unlockedOn", {
                        date: new Date(state!.unlockedAt as string).toLocaleDateString(dateLocale(), {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }),
                      })}
                    </span>
                    <span className="shrink-0 rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      +{a.xp} XP
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-[10px]">
                      <span className="truncate text-faint">
                        {formatNumber(prog.current)} / {formatNumber(prog.target)}
                      </span>
                      <span className="shrink-0 tabular font-semibold text-muted">
                        {Math.round(prog.pct)}%
                      </span>
                    </div>
                    <ProgressBar value={prog.pct} color={rarity.color} height={5} />
                  </div>
                )}
              </motion.li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

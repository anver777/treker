import { useMemo, useRef } from "react";
import { ImagePlus, Sparkles, Trash2, Zap } from "lucide-react";
import { useGame } from "@/store/GameContext";
import { useUI } from "@/store/UIContext";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Form";
import { RadialProgress } from "@/components/ui/Progress";
import { CharacterCard } from "@/components/rpg/CharacterCard";
import { StatRow } from "@/components/rpg/StatCard";
import { Avatar } from "@/components/rpg/Avatar";
import { ACHIEVEMENTS, unlockedCount } from "@/lib/achievements";
import { habitsOverview, lifeScore, questStats, statViews } from "@/lib/selectors";
import { levelInfo, rankTitle, statXpForLevel } from "@/lib/xp";
import { STATS, titleOptions } from "@/lib/stats";
import { useI18n } from "@/i18n";
import { compactNumber, formatNumber, formatPercent } from "@/lib/format";
import { todayISO } from "@/lib/date";
import { dateLocale } from "@/i18n";

export default function CharacterPage() {
  const { data, updateProfile, setAvatar, spendPoint } = useGame();
  const { navigate } = useUI();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const today = todayISO();

  const memo = useMemo(
    () => ({
      life: lifeScore(data, today),
      stats: statViews(data),
      info: levelInfo(data.profile.totalXp),
      habits: habitsOverview(data.habits, today),
      quests: questStats(data.quests, today),
    }),
    [data, today],
  );

  const longestStreak = data.habits.reduce(
    (max, h) => Math.max(max, h.bestStreak || 0),
    memo.habits.bestStreak,
  );

  const upload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return setAvatar(src);
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        setAvatar(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => setAvatar(src);
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <CharacterCard data={data} lifeScore={memo.life.score} className="lg:col-span-2" />

        <Card>
          <CardHeader title={t("char.avatar")} subtitle={t("char.identity")} icon={<Sparkles size={15} />} />
          <div className="flex flex-col items-center gap-4 p-5">
            <RadialProgress value={memo.info.progress} size={132} gradientTo="var(--accent-secondary)">
              <Avatar src={data.profile.avatar} name={data.profile.name} size={104} />
            </RadialProgress>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={15} /> {t("char.upload")}
              </Button>
              {data.profile.avatar ? (
                <Button size="sm" variant="ghost" onClick={() => setAvatar(null)}>
                  <Trash2 size={15} /> {t("char.remove")}
                </Button>
              ) : null}
            </div>
            <p className="text-center text-[11px] leading-relaxed text-faint">{t("char.avatarHint")}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label={t("char.totalXp")} value={formatNumber(data.profile.totalXp)} icon={<Zap size={15} />} />
        <StatTile
          label={t("char.achCount")}
          value={`${unlockedCount(data)}/${ACHIEVEMENTS.length}`}
          hint={t("dash.unlocked")}
          tone="warning"
        />
        <StatTile label={t("char.questsDone")} value={formatNumber(memo.quests.completed)} hint={`${memo.quests.total} ${t("common.total").toLowerCase()}`} />
        <StatTile label={t("char.longestStreak")} value={`${longestStreak} ${t("common.days")}`} tone="warning" hint={`${t("habits.currentStreak")}: ${memo.habits.currentStreak}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={t("char.stats")}
            subtitle={`${data.profile.characterPoints} ${
              data.profile.characterPoints === 1
                ? t("char.pointsAvailOne")
                : t("char.pointsAvail")
            }`}
          />
          <div>
            {memo.stats.map((s) => (
              <StatRow
                key={s.key}
                stat={s}
                canSpend={data.profile.characterPoints > 0}
                onSpend={() => spendPoint(s.key)}
              />
            ))}
          </div>
          <div className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-faint">
            {t("char.statsHint")}{" "}
            {t("char.statPointsHint", { xp: formatNumber(statXpForLevel(memo.info.level)) })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t("char.profile")} subtitle={t("set.profileSub")} />
            <div className="space-y-3 p-4">
              <Field label={t("common.name")}>
                <TextInput
                  value={data.profile.name}
                  maxLength={32}
                  onChange={(v) => updateProfile({ name: v })}
                  placeholder={t("common.name")}
                />
              </Field>
              <Field label={t("char.title")} hint={t("char.titleHint")}>
                <Select
                  value={data.profile.title}
                  onChange={(v) => updateProfile({ title: v })}
                  options={titleOptions()}
                />
              </Field>
              <Field label={t("char.mainGoal")}>
                <TextInput
                  value={data.profile.mainGoal}
                  maxLength={80}
                  onChange={(v) => updateProfile({ mainGoal: v })}
                  placeholder={t("form.goalPlaceholder")}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title={t("char.record")} subtitle={t("char.recordSub")} />
            <ul className="divide-y divide-line">
              <InfoRow label={t("char.joined")} value={new Date(data.profile.joinedAt).toLocaleDateString(dateLocale(), { month: "short", day: "numeric", year: "numeric" })} />
              <InfoRow label={t("dash.rank")} value={rankTitle(memo.info.level)} />
              <InfoRow label={t("char.habitCheckins")} value={formatNumber(memo.habits.totalCompletions)} />
              <InfoRow label={t("char.habitConsistency")} value={formatPercent(memo.habits.rate)} />
              <InfoRow label={t("dash.lifeScore")} value={`${memo.life.score} / 100`} />
              <InfoRow label={t("char.pointsSpent")} value={formatNumber(data.profile.spentPoints)} />
            </ul>
          </Card>

          <Card>
            <CardHeader title={t("char.statFocus")} subtitle={t("char.statFocusSub")} />
            <ul className="space-y-2 p-4">
              {[...memo.stats]
                .sort((a, b) => b.level - a.level)
                .slice(0, 4)
                .map((s) => (
                  <li key={s.key} className="flex items-center gap-2.5">
                    <span className="w-[86px] shrink-0 truncate text-[11px] text-faint">
                      {STATS[s.key].short}
                    </span>
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (s.level / 70) * 100)}%`,
                          background: STATS[s.key].color,
                        }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right text-[11px] font-semibold tabular text-ink">
                      {s.level}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title={t("char.achProgress")} subtitle={t("char.achProgressSub")} />
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">
          {ACHIEVEMENTS.slice(0, 6).map((a) => {
            const unlocked = Boolean(data.achievements[a.id]?.unlockedAt);
            return (
              <button
                key={a.id}
                onClick={() => navigate("achievements")}
                className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
                  unlocked
                    ? "border-warning/30 bg-warning/8 text-warning"
                    : "border-line bg-surface-2/40 text-faint"
                }`}
              >
                <span className="text-xl">{unlocked ? "🏆" : "🔒"}</span>
                <span className="w-full truncate text-[11px] font-semibold">{t(`ach.${a.id}.title`)}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2/40 p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{t("char.nextLevelIn", { xp: compactNumber(memo.info.xpRemaining) })}</p>
          <p className="text-[11px] text-faint">{t("char.nextLevelHint", { a: memo.info.level, b: memo.info.nextLevel })}</p>
        </div>
        <div className="flex gap-2">
          <IconButton label={t("char.goToQuests")} variant="secondary" onClick={() => navigate("quests")}>
            <Zap size={17} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <span className="shrink-0 text-[11px] text-faint">{label}</span>
      <span className="min-w-0 truncate text-[13px] font-medium text-ink">{value}</span>
    </li>
  );
}

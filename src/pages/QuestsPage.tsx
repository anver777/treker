import { useMemo, useState } from "react";
import { Plus, ListChecks, Filter } from "lucide-react";
import { useGame } from "@/store/GameContext";
import { useUI } from "@/store/UIContext";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Feedback";
import { QuestItem } from "@/components/quests/QuestItem";
import { DIFFICULTIES, QUEST_CATEGORIES } from "@/lib/stats";
import { questStats } from "@/lib/selectors";
import { formatPercent } from "@/lib/format";
import { todayISO } from "@/lib/date";
import type { QuestCategory } from "@/types";
import { useI18n } from "@/i18n";

type Filter = "all" | "active" | "completed" | QuestCategory;

export default function QuestsPage() {
  const { data, toggleQuest, setQuestProgress, deleteQuest } = useGame();
  const { openComposer } = useUI();
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>("active");
  const today = todayISO();

  const stats = useMemo(() => questStats(data.quests, today), [data.quests, today]);

  const quests = useMemo(() => {
    const list = [...data.quests];
    switch (filter) {
      case "all":
        return list;
      case "active":
        return list.filter((q) => !q.completed);
      case "completed":
        return list.filter((q) => q.completed);
      default:
        return list.filter((q) => q.category === filter);
    }
  }, [data.quests, filter]);

  const order: Record<string, number> = { main: 0, daily: 1, weekly: 2, monthly: 3, side: 4 };
  quests.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const cat = (order[a.category] ?? 9) - (order[b.category] ?? 9);
    if (cat !== 0) return cat;
    return b.xp - a.xp;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile label={t("quests.activeQuests")} value={stats.active} icon={<ListChecks size={15} />} />
        <StatTile label={t("common.completed")} value={stats.completed} hint={`${stats.total} ${t("common.total").toLowerCase()}`} />
        <StatTile
          label={t("quests.completionRate")}
          value={formatPercent(stats.rate, 0)}
          hint={t("quests.allTime")}
          tone="violet"
        />
        <StatTile label={t("quests.overdue")} value={stats.overdue} tone="danger" hint={t("quests.pastDeadline")} />
      </div>

      <Card>
        <CardHeader
          title={t("nav.quests")}
          subtitle={t("quests.sub")}
          icon={<ListChecks size={15} />}
          action={
            <Button size="sm" variant="primary" onClick={() => openComposer("quest")}>
              <Plus size={15} /> {t("dash.newQuest")}
            </Button>
          }
        />

        <div className="border-b border-line px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 text-[11px] text-faint">
            <Filter size={13} />
            {t("quests.filter")}
          </div>
          <Chips
            className="mt-2"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "active", label: t("common.active") },
              { value: "all", label: t("common.all") },
              { value: "completed", label: t("common.completed") },
              ...(Object.keys(QUEST_CATEGORIES) as QuestCategory[]).map((k) => ({
                value: k as Filter,
                label: QUEST_CATEGORIES[k].short,
              })),
            ]}
          />
        </div>

        {quests.length === 0 ? (
          <EmptyState
            icon={<ListChecks size={22} />}
            title={filter === "completed" ? t("quests.noCompleted") : t("quests.noQuests")}
            description={t("quests.noQuestsSub")}
            action={
              <Button size="sm" variant="primary" onClick={() => openComposer("quest")}>
                <Plus size={15} /> Create Quest
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-2.5 p-3 sm:p-4 lg:grid-cols-2">
            {quests.map((q) => (
              <QuestItem
                key={q.id}
                quest={q}
                onToggle={() => toggleQuest(q.id)}
                onProgress={(v) => setQuestProgress(q.id, v)}
                onEdit={() => openComposer("quest", q.id)}
                onDelete={() => deleteQuest(q.id)}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title={t("quests.howXp")} subtitle={t("quests.howXpSub")} />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["easy", "medium", "hard", "epic"] as const).map((key) => {
            const d = { label: DIFFICULTIES[key].label, xp: `+${DIFFICULTIES[key].xp} XP`, color: DIFFICULTIES[key].color };
            return (
            <div key={d.label} className="rounded-xl border border-line bg-surface-2/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: d.color }}>
                {d.label}
              </p>
              <p className="mt-1 text-lg font-semibold tabular text-ink">{d.xp}</p>
              <p className="mt-0.5 text-[10px] text-faint">{t("quests.basePreset")}</p>
            </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

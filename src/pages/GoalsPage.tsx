import { useMemo } from "react";
import { Plus, Target, Trophy } from "lucide-react";
import { useGame } from "@/store/GameContext";
import { useUI } from "@/store/UIContext";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { GoalCard } from "@/components/goals/GoalCard";
import { goalStats } from "@/lib/selectors";
import { formatPercent } from "@/lib/format";
import { GOAL_CATEGORIES } from "@/lib/stats";
import { useI18n } from "@/i18n";

export default function GoalsPage() {
  const { data, setGoalProgress, toggleMilestone, addMilestone, removeMilestone, deleteGoal } = useGame();
  const { openComposer } = useUI();
  const { t } = useI18n();

  const stats = useMemo(() => goalStats(data.goals), [data.goals]);
  const milestonesTotal = data.goals.reduce((s, g) => s + g.milestones.length, 0);
  const milestonesDone = data.goals.reduce((s, g) => s + g.milestones.filter((m) => m.done).length, 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile label={t("nav.goals")} value={stats.total} hint={`${stats.completed} ${t("common.completed").toLowerCase()}`} icon={<Target size={15} />} />
        <StatTile label={t("goals.inProgress")} value={stats.total - stats.completed} />
        <StatTile label={t("goals.avgProgress")} value={formatPercent(stats.avgProgress, 0)} tone="violet" />
        <StatTile
          label={t("goals.milestones")}
          value={`${milestonesDone}/${milestonesTotal}`}
          hint={t("goals.milestonesSub")}
          tone="warning"
          icon={<Trophy size={15} />}
        />
      </div>

      <Card>
        <CardHeader
          title={t("goals.lifeGoals")}
          subtitle={t("goals.lifeGoalsSub")}
          icon={<Target size={15} />}
          action={
            <Button size="sm" variant="primary" onClick={() => openComposer("goal")}>
              <Plus size={15} /> {t("form.newGoal")}
            </Button>
          }
        />
        {data.goals.length === 0 ? (
          <EmptyState
            icon={<Target size={22} />}
            title={t("goals.noGoals")}
            description={t("goals.noGoalsSub")}
            action={
              <Button size="sm" variant="primary" onClick={() => openComposer("goal")}>
                <Plus size={15} /> Create Goal
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2">
            {data.goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onProgress={(v) => setGoalProgress(g.id, v)}
                onToggleMilestone={(mid) => toggleMilestone(g.id, mid)}
                onAddMilestone={(text) => addMilestone(g.id, text)}
                onRemoveMilestone={(mid) => removeMilestone(g.id, mid)}
                onDelete={() => deleteGoal(g.id)}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title={t("goals.categories")} subtitle={t("goals.categoriesSub")} />
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {Object.entries(GOAL_CATEGORIES)
            .filter(([key]) => data.goals.some((g) => g.category === key))
            .map(([key, meta]) => {
              const list = data.goals.filter((g) => g.category === key);
              const avg = list.reduce((s, g) => s + g.progress, 0) / Math.max(1, list.length);
              return (
                <div key={key} className="min-w-0 rounded-xl border border-line bg-surface-2/40 p-3">
                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: meta.color }}>
                    {meta.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular text-ink">{list.length}</p>
                  <p className="text-[10px] text-faint">{t("goals.avg")} {Math.round(avg)}%</p>
                </div>
              );
            })}
          {data.goals.length === 0 ? (
            <p className="col-span-full text-[11px] text-faint">{t("goals.categoriesEmpty")}</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

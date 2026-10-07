import { Check, Clock, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { DIFFICULTIES, QUEST_CATEGORIES, STATS } from "@/lib/stats";
import { deadlineStatus } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import type { Quest } from "@/types";
import { ProgressBar, XPPill } from "@/components/ui/Progress";
import { cn } from "@/utils/cn";
import { tr } from "@/i18n";

export function QuestItem({
  quest,
  onToggle,
  onProgress,
  onDelete,
  onEdit,
  compact = false,
}: {
  quest: Quest;
  onToggle: () => void;
  onProgress?: (value: number) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  compact?: boolean;
}) {
  const diff = DIFFICULTIES[quest.difficulty];
  const cat = QUEST_CATEGORIES[quest.category];
  const due = deadlineStatus(quest.deadline);
  const stat = quest.stat ? STATS[quest.stat] : null;
  const done = quest.completed;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group card-surface flex min-w-0 gap-3 p-3 transition-all duration-200",
        done ? "opacity-60" : "hover:border-accent/25",
      )}
    >
      <button
        onClick={onToggle}
        aria-label={done ? `${tr("quests.reopen")}: ${quest.title}` : `${tr("quests.complete")}: ${quest.title}`}
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition active:scale-90",
          done
            ? "border-accent bg-accent text-[#04150e]"
            : "border-line-strong text-faint hover:border-accent hover:text-accent",
        )}
      >
        {done ? <Check size={17} strokeWidth={3} className="anim-check" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={cn(
              "min-w-0 flex-1 basis-[60%] text-sm font-semibold leading-snug text-ink",
              done && "line-through decoration-line-strong",
            )}
          >
            {quest.title}
          </p>
          <XPPill xp={quest.xp} />
        </div>

        {!compact && quest.description ? (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-faint">
            {quest.description}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
            style={{ background: `${diff.color}18`, color: diff.color }}
          >
            {cat.short}
          </span>
          <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-faint">
            {diff.label}
          </span>
          {stat ? (
            <span
              className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
              style={{ background: `${stat.color}18`, color: stat.color }}
            >
              {stat.short}
            </span>
          ) : null}
          {quest.deadline ? (
            <span
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
                due.tone === "late"
                  ? "bg-danger/15 text-danger"
                  : due.tone === "soon"
                    ? "bg-warning/15 text-warning"
                    : "bg-surface-2 text-faint",
              )}
            >
              <Clock size={9} />
              {due.tone === "late"
                ? tr("quests.overdueBy", { n: Math.abs(due.days) })
                : due.days === 0
                  ? tr("quests.dueToday")
                  : due.days === 1
                    ? tr("quests.dueTomorrow")
                    : tr("quests.daysLeft", { n: due.days })}
            </span>
          ) : null}
        </div>

        {quest.target > 1 || quest.progress > 0 ? (
          <div className="mt-2.5">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-faint">
              <span className="tabular">
                {Math.round((quest.progress / 100) * quest.target)}/{quest.target} · {quest.progress}%
              </span>
              {onProgress && !done ? (
                <span className="flex gap-1">
                  <StepButton label="-" onClick={() => onProgress(quest.progress - 100 / quest.target)} />
                  <StepButton label="+" onClick={() => onProgress(quest.progress + 100 / quest.target)} />
                </span>
              ) : null}
            </div>
            <ProgressBar value={quest.progress} color={diff.color} height={5} />
          </div>
        ) : null}
      </div>

      {!compact ? (
        <div className="flex shrink-0 flex-col items-center self-start gap-1">
          {onEdit ? (
            <button
              onClick={onEdit}
              aria-label={`${tr("common.edit")}: ${quest.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-accent/10 hover:text-accent"
            >
              <Pencil size={14} />
            </button>
          ) : null}
          {onDelete ? (
            <button
              onClick={onDelete}
              aria-label={`Delete ${quest.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      ) : null}
    </motion.li>
  );
}

function StepButton({ label, onClick }: { label: "+" | "-"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label === "+" ? tr("quests.moreProgress") : tr("quests.lessProgress")}
      className="flex h-5 w-5 items-center justify-center rounded-md border border-line text-[11px] leading-none text-muted transition hover:border-accent hover:text-accent active:scale-90"
    >
      {label}
    </button>
  );
}

export function QuestSkeletonRow() {
  return (
    <li className="card-surface flex gap-3 p-3">
      <div className="skeleton h-9 w-9 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="skeleton h-3.5 w-2/3" />
        <div className="skeleton h-2.5 w-1/3" />
      </div>
    </li>
  );
}

export function questProgressLabel(quest: Quest): string {
  if (quest.target <= 1) return quest.completed ? tr("common.completed") : tr("quests.notStarted");
  return `${Math.round((quest.progress / 100) * quest.target)}/${quest.target} · ${formatNumber(quest.progress)}%`;
}

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { GOAL_CATEGORIES } from "@/lib/stats";
import { deadlineStatus } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import type { Goal } from "@/types";
import { ProgressBar, XPPill } from "@/components/ui/Progress";
import { TextInput } from "@/components/ui/Form";
import { cn } from "@/utils/cn";
import { tr } from "@/i18n";

export function GoalCard({
  goal,
  onProgress,
  onToggleMilestone,
  onAddMilestone,
  onRemoveMilestone,
  onDelete,
}: {
  goal: Goal;
  onProgress: (value: number) => void;
  onToggleMilestone: (milestoneId: string) => void;
  onAddMilestone: (text: string) => void;
  onRemoveMilestone: (milestoneId: string) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const cat = GOAL_CATEGORIES[goal.category] || GOAL_CATEGORIES.other;
  const due = deadlineStatus(goal.deadline);
  const doneCount = goal.milestones.filter((m) => m.done).length;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-surface min-w-0 overflow-hidden"
    >
      <div className="p-4">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
                style={{ background: `${cat.color}18`, color: cat.color }}
              >
                {cat.label}
              </span>
              {goal.completedAt ? (
                <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
                  Completed
                </span>
              ) : null}
              {goal.deadline ? (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
                    due.tone === "late"
                      ? "bg-danger/15 text-danger"
                      : due.tone === "soon"
                        ? "bg-warning/15 text-warning"
                        : "bg-surface-2 text-faint",
                  )}
                >
                  {due.label}
                </span>
              ) : null}
            </div>
            <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-ink">{goal.title}</h3>
            {goal.description ? (
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-faint">
                {goal.description}
              </p>
            ) : null}
          </div>
          <button
            onClick={onDelete}
            aria-label={`${tr("common.delete")}: ${goal.title}`}
            className="h-8 w-8 shrink-0 rounded-lg text-faint transition hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={14} className="mx-auto" />
          </button>
        </div>

        <div className="mt-3.5">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[11px] text-muted">
              {goal.milestones.length > 0
                ? tr("goals.milestoneCount", { done: doneCount, total: goal.milestones.length })
                : tr("common.progress")}
            </span>
            <span className="text-xs font-semibold tabular text-ink">{Math.round(goal.progress)}%</span>
          </div>
          <ProgressBar value={goal.progress} color={cat.color} height={7} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <XPPill xp={goal.xp} />
            <div className="flex items-center gap-1.5">
              <StepBtn label="-" onClick={() => onProgress(goal.progress - 5)} disabled={goal.progress <= 0} />
              <StepBtn label="+" onClick={() => onProgress(goal.progress + 5)} disabled={goal.progress >= 100} />
              <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex h-8 items-center gap-1 rounded-lg border border-line px-2 text-[11px] font-medium text-muted transition hover:border-accent hover:text-accent"
              >
                {tr("goals.milestonesToggle")}
                <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line bg-surface-2/40 p-4">
          {goal.milestones.length === 0 ? (
            <p className="text-[11px] text-faint">{tr("goals.noMilestones")}</p>
          ) : (
            <ul className="space-y-1">
              {goal.milestones.map((m) => (
                <li key={m.id} className="group flex min-w-0 items-center gap-2">
                  <button
                    onClick={() => onToggleMilestone(m.id)}
                    aria-pressed={m.done}
                    aria-label={m.text}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition active:scale-90",
                      m.done
                        ? "border-transparent bg-accent text-[#04150e]"
                        : "border-line-strong text-transparent hover:border-accent",
                    )}
                  >
                    <Check size={13} strokeWidth={3} />
                  </button>
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-[13px] leading-snug text-ink",
                      m.done && "text-faint line-through decoration-line-strong",
                    )}
                  >
                    {m.text}
                  </span>
                  <button
                    onClick={() => onRemoveMilestone(m.id)}
                    aria-label={`${tr("common.delete")}: ${m.text}`}
                    className="h-6 w-6 shrink-0 rounded-md text-faint opacity-0 transition hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <X size={12} className="mx-auto" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const text = draft.trim();
              if (!text) return;
              onAddMilestone(text);
              setDraft("");
            }}
          >
            <TextInput value={draft} onChange={setDraft} placeholder={tr("goals.newMilestone")} maxLength={70} />
            <button
              type="submit"
              aria-label={tr("goals.addMilestone")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-[#04150e] transition active:scale-95"
            >
              <Plus size={17} />
            </button>
          </form>
          <p className="mt-2 text-[10px] text-faint">
            {tr("goals.milestoneHint", { xp: formatNumber(goal.xp) })}
          </p>
        </div>
      ) : null}
    </motion.li>
  );
}

function StepBtn({ label, onClick, disabled }: { label: "+" | "-"; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label === "+" ? tr("goals.moreProgress") : tr("goals.lessProgress")}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-xs text-muted transition hover:border-accent hover:text-accent active:scale-90 disabled:opacity-30"
    >
      {label}
    </button>
  );
}

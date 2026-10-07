import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Chips, Field, Select, Slider, TextArea, TextInput } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import {
  DIFFICULTIES,
  EXPENSE_CATEGORIES,
  GOAL_CATEGORIES,
  HABIT_CATEGORIES,
  HABIT_COLORS,
  HABIT_ICONS,
  INCOME_CATEGORIES,
  QUEST_CATEGORIES,
  STATS,
  STAT_KEYS,
} from "@/lib/stats";
import { useGame } from "@/store/GameContext";
import { useUI } from "@/store/UIContext";
import type {
  Difficulty,
  GoalCategory,
  HabitCategory,
  HabitFrequency,
  QuestCategory,
  StatKey,
} from "@/types";
import { todayISO, weekdayLabels } from "@/lib/date";
import { useI18n } from "@/i18n";
import { tr } from "@/i18n";
import { clamp } from "@/lib/format";

/* ============================================================
   Global create / edit modals, driven by the composer state.
   They are mounted once so any page (and the FAB) can open them.
   ============================================================ */

export function ComposerHost() {
  const { composer, closeComposer } = useUI();
  const L = useI18n().t;
  const title =
    composer?.kind === "quest"
      ? composer.id
        ? L("form.editQuest")
        : L("form.newQuest")
      : composer?.kind === "habit"
        ? L("form.newHabit")
        : composer?.kind === "goal"
          ? L("form.newGoal")
          : composer?.kind === "income"
            ? L("form.addIncome")
            : L("form.addExpense");

  return (
    <Modal
      open={composer !== null}
      onClose={closeComposer}
      title={title}
      description={L("form.sub")}
      size="md"
    >
      {composer?.kind === "quest" ? <QuestForm onDone={closeComposer} /> : null}
      {composer?.kind === "habit" ? <HabitForm onDone={closeComposer} /> : null}
      {composer?.kind === "goal" ? <GoalForm onDone={closeComposer} /> : null}
      {composer?.kind === "income" || composer?.kind === "expense" ? (
        <TransactionForm onDone={closeComposer} forcedType={composer.kind} />
      ) : null}
      {composer === null ? <EmptyState title={L("common.close")} /> : null}
    </Modal>
  );
}

const CATEGORY_OPTIONS = (Object.keys(QUEST_CATEGORIES) as QuestCategory[]) as QuestCategory[];
const DIFFICULTY_KEYS = (Object.keys(DIFFICULTIES) as Difficulty[]) as Difficulty[];
function statOptions() {
  return [
    { value: "none", label: tr("form.noStat") },
    ...STAT_KEYS.map((k) => ({ value: k, label: `${STATS[k].label} (${STATS[k].short})` })),
  ];
}

/* ------------------------------ Quest ------------------------------ */

function QuestForm({ onDone }: { onDone: () => void }) {
  const { addQuest, updateQuest, data } = useGame();
  const { composer } = useUI();
  const existing = data.quests.find((q) => q.id === composer?.id);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState<QuestCategory>(existing?.category ?? "daily");
  const [difficulty, setDifficulty] = useState<Difficulty>(existing?.difficulty ?? "medium");
  const [xp, setXp] = useState(String(existing?.xp ?? DIFFICULTIES.medium.xp));
  const [stat, setStat] = useState<string>(existing?.stat ?? "knowledge");
  const [deadline, setDeadline] = useState(existing?.deadline ?? "");
  const [target, setTarget] = useState(String(existing?.target ?? 1));
  const { t } = useI18n();
  const [error, setError] = useState("");

  useEffect(() => {
    setXp(String(DIFFICULTIES[difficulty].xp));
  }, [difficulty]);

  const submit = () => {
    const trimmed = title.trim();
    const xpNum = Math.round(Number(xp));
    const targetNum = Math.round(Number(target));
    if (!trimmed) return setError(t("form.err.nameRequired"));
    if (trimmed.length > 90) return setError(t("form.err.nameLong"));
    if (!Number.isFinite(xpNum) || xpNum < 0 || xpNum > 5000)
      return setError(t("form.err.xpRange"));
    if (!Number.isFinite(targetNum) || targetNum < 1 || targetNum > 1000)
      return setError(t("form.err.targetRange"));
    if (deadline && deadline < todayISO()) return setError(t("form.err.pastDeadline"));
    const payload = {
      title: trimmed,
      description: description.trim(),
      category,
      difficulty,
      xp: xpNum,
      stat: (stat === "none" ? null : stat) as StatKey | null,
      deadline: deadline || null,
      target: targetNum,
      linkedHabitId: null,
    };
    if (existing) {
      updateQuest(existing.id, payload);
    } else {
      addQuest({ ...payload, progress: 0 });
    }
    onDone();
  };

  return (
    <div className="space-y-4">
      <Field label={t("form.questName")} required error={error}>
        <TextInput value={title} onChange={setTitle} placeholder={t("form.questPlaceholder")} maxLength={90} invalid={Boolean(error)} />
      </Field>
      <Field label={t("common.description")}>
        <TextArea value={description} onChange={setDescription} placeholder={t("form.descPlaceholder")} />
      </Field>
      <Field label={t("common.category")}>
        <Chips
          value={category}
          onChange={setCategory}
          options={CATEGORY_OPTIONS.map((k) => ({ value: k, label: QUEST_CATEGORIES[k].short, color: DIFFICULTIES[k === "daily" ? "easy" : "medium"].color }))}
        />
      </Field>
      <Field label={t("form.difficulty")} hint={t("form.difficultyHint")}>
        <Chips
          value={difficulty}
          onChange={setDifficulty}
          options={DIFFICULTY_KEYS.map((k) => ({ value: k, label: DIFFICULTIES[k].label, color: DIFFICULTIES[k].color }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("form.xpReward")}>
          <TextInput
            type="number"
            value={xp}
            onChange={(v) => setXp(v.replace(/[^0-9]/g, ""))}
            min={0}
            max={5000}
          />
        </Field>
        <Field
          label={t("form.target")}
          hint={category === "main" || category === "side" ? t("form.targetHintSteps") : t("form.targetHintSingle")}
        >
          <TextInput
            type="number"
            value={target}
            onChange={(v) => setTarget(v.replace(/[^0-9]/g, ""))}
            min={1}
            max={1000}
          />
        </Field>
      </div>
      <Field label={t("form.relatedStat")}>
        <Select value={stat} onChange={setStat} options={statOptions()} />
      </Field>
      <Field label={t("form.deadline")}>
        <TextInput type="date" value={deadline} onChange={setDeadline} />
      </Field>
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" onClick={submit}>
          {existing ? t("form.saveQuest") : t("form.createQuest")}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ Habit ------------------------------ */

function HabitForm({ onDone }: { onDone: () => void }) {
  const { addHabit, data } = useGame();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(HABIT_ICONS[0]);
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [stat] = useState<StatKey>("discipline");
  const [stats, setStats] = useState<StatKey[]>(["discipline"]);
  const [xp, setXp] = useState("20");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<HabitCategory>("health");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [customDays, setCustomDays] = useState<number[]>([1, 3, 5]);
  const [startDate, setStartDate] = useState(todayISO());
  const [goalId, setGoalId] = useState("none");
  const [reminder, setReminder] = useState("");
  const [error, setError] = useState("");

  const toggleStat = (key: StatKey) => {
    setStats((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      if (next.length === 0) return [key];
      return next.slice(0, 4);
    });
  };

  const submit = () => {
    const trimmed = name.trim();
    const xpNum = Math.round(Number(xp));
    if (!trimmed) return setError(t("form.err.habitRequired"));
    if (trimmed.length > 48) return setError(t("form.err.habitLong"));
    if (!Number.isFinite(xpNum) || xpNum < 1 || xpNum > 200)
      return setError(t("form.err.habitXp"));
    if (frequency === "custom" && customDays.length === 0)
      return setError(t("form.err.customDays"));
    if (startDate > todayISO()) return setError(t("form.err.startDate"));
    addHabit({
      name: trimmed,
      icon,
      stat: stats[0] || stat,
      stats: stats.length > 0 ? stats : [stat],
      xp: xpNum,
      color,
      description: description.trim().slice(0, 160),
      category,
      frequency,
      customDays: frequency === "custom" ? [...customDays].sort() : [],
      startDate,
      pausedFrom: null,
      pausedUntil: null,
      goalId: goalId === "none" ? null : goalId,
      reminder: /^\d{2}:\d{2}$/.test(reminder) ? reminder : "",
      status: "active",
    });
    onDone();
  };

  const dayLabels = weekdayLabels(true);

  return (
    <div className="space-y-4">
      <Field label={t("form.habitName")} required error={error}>
        <TextInput
          value={name}
          onChange={setName}
          placeholder={t("form.habitPlaceholder")}
          maxLength={48}
          invalid={Boolean(error)}
        />
      </Field>
      <Field label={t("common.description")} hint={t("form.habitDescHint")}>
        <TextArea value={description} onChange={setDescription} rows={2} maxLength={160} />
      </Field>
      <Field label={t("form.icon")}>
        <div className="grid grid-cols-8 gap-1.5">
          {HABIT_ICONS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIcon(i)}
              aria-label={i}
              aria-pressed={icon === i}
              className={`flex h-10 items-center justify-center rounded-xl border text-lg transition active:scale-95 ${
                icon === i ? "border-accent bg-accent/12" : "border-line bg-surface-2 hover:border-line-strong"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t("form.color")}>
        <div className="flex flex-wrap gap-2">
          {HABIT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              aria-pressed={color === c}
              className="h-9 w-9 rounded-xl border-2 transition active:scale-95"
              style={{ background: `${c}33`, borderColor: color === c ? c : "transparent" }}
            >
              <span className="mx-auto block h-3.5 w-3.5 rounded-full" style={{ background: c }} />
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("form.habitCategory")}>
        <Chips
          value={category}
          onChange={(v) => setCategory(v as HabitCategory)}
          options={HABIT_CATEGORIES.map((c) => ({ value: c.key as HabitCategory, label: c.label }))}
        />
      </Field>

      <Field label={t("form.frequency")} hint={t("form.frequencyHint")}>
        <Chips
          value={frequency}
          onChange={setFrequency}
          options={[
            { value: "daily", label: t("freq.daily") },
            { value: "weekdays", label: t("freq.weekdays") },
            { value: "weekends", label: t("freq.weekends") },
            { value: "custom", label: t("freq.custom") },
          ]}
        />
      </Field>

      {frequency === "custom" ? (
        <Field label={t("form.customDays")} hint={t("form.customDaysHint")}>
          <div className="flex flex-wrap gap-1.5">
            {dayLabels.map((label, i) => {
              const dow = (i + 1) % 7; // Mon-first list -> JS day index
              const active = customDays.includes(dow);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setCustomDays((prev) =>
                      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow],
                    )
                  }
                  aria-pressed={active}
                  className={`h-10 min-w-[44px] rounded-xl border px-2 text-[11px] font-semibold transition active:scale-95 ${
                    active ? "border-accent bg-accent/15 text-accent" : "border-line bg-surface-2 text-muted"
                  }`}
                >
                  {label.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </Field>
      ) : null}

      <Field label={t("form.relatedStats")} hint={t("form.relatedStatsHint")}>
        <div className="flex flex-wrap gap-1.5">
          {STAT_KEYS.map((key) => {
            const active = stats.includes(key);
            const meta = STATS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleStat(key)}
                aria-pressed={active}
                className="flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition active:scale-95"
                style={{
                  borderColor: active ? meta.color : "var(--border)",
                  color: active ? meta.color : "var(--text-secondary)",
                  background: active ? `${meta.color}18` : "transparent",
                }}
              >
                <Icon name={meta.icon} size={13} />
                <span className="max-w-[92px] truncate">{meta.short}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("form.xpReward")} hint={t("form.xpRangeHint")}>
          <TextInput
            type="number"
            value={xp}
            onChange={(v) => setXp(v.replace(/[^0-9]/g, ""))}
            min={1}
            max={200}
          />
        </Field>
        <Field label={t("form.startDate")}>
          <TextInput type="date" value={startDate} onChange={setStartDate} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("form.relatedGoal")}>
          <Select
            value={goalId}
            onChange={setGoalId}
            options={[
              { value: "none", label: t("form.noGoal") },
              ...data.goals.map((g) => ({ value: g.id, label: g.title })),
            ]}
          />
        </Field>
        <Field label={t("form.reminder")} hint={t("form.reminderHint")}>
          <TextInput type="time" value={reminder} onChange={setReminder} />
        </Field>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" onClick={submit}>
          {t("form.createHabit")}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ Goal ------------------------------ */

function GoalForm({ onDone }: { onDone: () => void }) {
  const { addGoal } = useGame();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GoalCategory>("career");
  const [deadline, setDeadline] = useState("");
  const [xp, setXp] = useState("1000");
  const [stat, setStat] = useState<StatKey>("career");
  const [progress, setProgress] = useState(0);
  const [milestones, setMilestones] = useState<string[]>([""]);
  const [error, setError] = useState("");

  const submit = () => {
    const trimmed = title.trim();
    const xpNum = Math.round(Number(xp));
    if (!trimmed) return setError(t("form.err.goalRequired"));
    if (trimmed.length > 90) return setError(t("form.err.goalLong"));
    if (!Number.isFinite(xpNum) || xpNum < 50 || xpNum > 5000)
      return setError(t("form.err.goalXp"));
    if (deadline && deadline < todayISO()) return setError(t("form.err.pastDeadline"));
    const clean = milestones.map((m) => m.trim()).filter(Boolean).slice(0, 20);
    addGoal({
      title: trimmed,
      description: description.trim(),
      category,
      deadline: deadline || null,
      progress: clamp(progress, 0, 100),
      xp: xpNum,
      stat,
      milestones: clean.map((text) => ({ id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, text, done: false })),
    });
    onDone();
  };

  return (
    <div className="space-y-4">
      <Field label={t("form.goalTitle")} required error={error}>
        <TextInput value={title} onChange={setTitle} placeholder={t("form.goalPlaceholder")} maxLength={90} invalid={Boolean(error)} />
      </Field>
      <Field label={t("common.description")}>
                  <TextArea value={description} onChange={setDescription} placeholder={t("form.goalDescPlaceholder")} />
      </Field>
      <Field label={t("common.category")}>
                  <Select
          value={category}
          onChange={setCategory}
          options={(Object.keys(GOAL_CATEGORIES) as GoalCategory[]).map((k) => ({
            value: k,
            label: GOAL_CATEGORIES[k].label,
          }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("form.deadline")}>
                    <TextInput type="date" value={deadline} onChange={setDeadline} />
        </Field>
        <Field label={t("form.xpReward")} hint={t("form.goalXpHint")}>
                    <TextInput type="number" value={xp} onChange={(v) => setXp(v.replace(/[^0-9]/g, ""))} min={50} max={5000} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("form.feedsStat")}>
                      <Select
            value={stat}
            onChange={setStat}
            options={STAT_KEYS.map((k) => ({ value: k, label: STATS[k].label }))}
          />
        </Field>
        <div className="flex items-end pb-1">
          <Slider label={t("form.currentProgress")} value={progress} onChange={setProgress} />
        </div>
      </div>
      <Field label={t("goals.milestones")} hint={t("form.milestonesHint")}>
                <div className="space-y-2">
          {milestones.map((m, i) => (
            <div key={i} className="flex gap-2">
              <TextInput
                value={m}
                onChange={(v) => setMilestones((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
                placeholder={t("form.milestoneN", { n: i + 1 })}
                maxLength={70}
              />
              <Button
                variant="danger"
                size="icon"
                aria-label={t("goals.addMilestone")}
                onClick={() => setMilestones((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMilestones((prev) => [...prev, ""])}
            disabled={milestones.length >= 20}
          >
            + {t("goals.addMilestone")}
          </Button>
        </div>
      </Field>
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" onClick={submit}>
          {t("form.createGoal")}
        </Button>
      </div>
    </div>
  );
}

/* ---------------------------- Transaction ---------------------------- */

function TransactionForm({
  onDone,
  forcedType,
}: {
  onDone: () => void;
  forcedType?: "income" | "expense";
}) {
  const { addTransaction, data } = useGame();
  const { t } = useI18n();
  const [type, setType] = useState<"income" | "expense">(forcedType ?? "expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(forcedType === "income" ? "salary" : "food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");

  useEffect(() => {
    setCategory(type === "income" ? "salary" : "food");
  }, [type]);

  const options = useMemo(
    () =>
      (type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => ({
        value: c.key,
        label: c.label,
      })),
    [type],
  );

  const submit = () => {
    const value = Number(amount.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(value) || value <= 0) return setError(t("form.err.amount"));
    if (value > 100000000) return setError(t("form.err.amountLarge"));
    if (!date) return setError(t("form.err.dateRequired"));
    addTransaction({
      type,
      amount: Math.round(value),
      category,
      note: note.trim().slice(0, 60),
      date,
    });
    onDone();
  };

  return (
    <div className="space-y-4">
      <Field label={t("common.type")}>
                  <Chips
          value={type}
          onChange={(v) => setType(v)}
          options={[
            { value: "income", label: t("form.incomeType"), color: "var(--accent)" },
            { value: "expense", label: t("form.expenseType"), color: "var(--danger)" },
          ]}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("form.amountCurrency", { currency: data.profile.currency })} required error={error}>
          <TextInput value={amount} onChange={(v) => setAmount(v)} placeholder="10 000" />
        </Field>
        <Field label={t("common.category")}>
                    <Select value={category} onChange={setCategory} options={options} />
        </Field>
      </div>
      <Field label={t("common.note")}>
                  <TextInput value={note} onChange={setNote} placeholder={t("form.notePlaceholder")} maxLength={60} />
      </Field>
      <Field label={t("common.date")}>
                  <TextInput type="date" value={date} onChange={setDate} />
      </Field>
      <p className="rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-[11px] leading-relaxed text-muted">
        {t("form.incomeXpHint", { currency: data.profile.currency })}
      </p>
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" onClick={submit}>
          {t("form.saveTransaction")}
        </Button>
      </div>
    </div>
  );
}


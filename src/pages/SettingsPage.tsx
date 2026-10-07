import { useMemo, useRef, useState } from "react";
import {
  Bell,
  Database,
  Download,
  Palette,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useGame } from "@/store/GameContext";
import { useUI } from "@/store/UIContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chips, Field, Select, Switch, TextInput } from "@/components/ui/Form";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ErrorNote } from "@/components/ui/Feedback";
import { InstallCard } from "@/components/pwa/Install";
import { isAIConfigured } from "@/services/aiService";
import { titleOptions } from "@/lib/stats";
import { LanguageToggle, useI18n } from "@/i18n";
import { formatNumber } from "@/lib/format";

const CURRENCIES = ["₽", "$", "€", "£", "₸", "₴", "﷼"];

export default function SettingsPage() {
  const { data, updateProfile, updateSettings, importData, resetAll, loadDemo } = useGame();
  const { navigate } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const { t } = useI18n();

  const storageSize = useMemo(() => {
    try {
      const raw = localStorage.getItem("life-rpg.state.v1") || "";
      return Math.max(1, Math.round(raw.length / 1024));
    } catch {
      return 0;
    }
  }, [data]);

  const exportData = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `life-rpg-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setNotice({ tone: "ok", text: t("set.backupOk") });
    } catch {
      setNotice({ tone: "error", text: t("set.backupFail") });
    }
  };

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const result = importData(json);
      if (result.ok) {
        setNotice({ tone: "ok", text: t("set.importOk") });
      } else {
        setNotice({ tone: "error", text: t("set.importFail") });
      }
    } catch {
      setNotice({ tone: "error", text: t("set.invalidJson") });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {notice ? (
        <ErrorNote
          message={notice.text}
          onRetry={() => setNotice(null)}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("char.profile")} subtitle={t("set.profileSub")} icon={<User size={15} />} />
          <div className="space-y-3 p-4">
            <Field label={t("common.name")}>
                            <TextInput
                value={data.profile.name}
                maxLength={32}
                onChange={(v) => updateProfile({ name: v })}
                placeholder={t("common.name")}
              />
            </Field>
            <Field label={t("char.title")}>
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
            <Field label={t("common.amount")}>
                            <Select
                value={data.profile.currency}
                onChange={(v) => updateProfile({ currency: v })}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t("set.appearance")}
            subtitle={t("set.appearanceSub")}
            icon={<Palette size={15} />}
          />
          <div className="space-y-3 p-4">
            <Field label={t("set.theme")}>
                            <Chips
                value={data.settings.theme}
                onChange={(v) => updateSettings({ theme: v })}
                options={[
                  { value: "dark", label: t("set.theme.dark") },
                  { value: "light", label: t("set.theme.light") },
                  { value: "system", label: t("set.theme.system") },
                ]}
              />
            </Field>
            <Switch
              label={t("set.reduceMotion")}
              hint={t("set.reduceMotionHint")}
              checked={data.settings.reduceMotion}
              onChange={(v) => updateSettings({ reduceMotion: v })}
            />
            <p className="rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-[11px] leading-relaxed text-faint">
              {t("set.appearanceNote")}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("set.notifications")} subtitle={t("set.notificationsSub")} icon={<Bell size={15} />} />
          <div className="space-y-2.5 p-4">
            <Switch
              label={t("set.xpToasts")}
              hint={t("set.xpToastsHint")}
              checked={data.settings.xpToasts}
              onChange={(v) => updateSettings({ xpToasts: v })}
            />
            <Switch
              label={t("set.achPopups")}
              hint={t("set.achPopupsHint")}
              checked={data.settings.achievementPopups}
              onChange={(v) => updateSettings({ achievementPopups: v })}
            />
            <Switch
              label={t("set.levelUpAnim")}
              hint={t("set.levelUpAnimHint")}
              checked={data.settings.levelUpAnimation}
              onChange={(v) => updateSettings({ levelUpAnimation: v })}
            />
            <Switch
              label={t("set.sound")}
              hint={t("set.soundHint")}
              checked={data.settings.sound}
              onChange={(v) => updateSettings({ sound: v })}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title={t("set.ai")} subtitle={t("set.aiSub")} icon={<Sparkles size={15} />} />
          <div className="space-y-3 p-4">
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${
                isAIConfigured()
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-violet/40 bg-violet/10 text-violet"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isAIConfigured() ? "bg-accent" : "bg-violet"}`} />
              {isAIConfigured() ? t("set.aiConfigured") : t("set.aiNotConfigured")}
            </div>
            <Switch
              label={t("set.enableAi")}
              hint={t("set.enableAiHint")}
              checked={data.settings.aiEnabled}
              onChange={(v) => updateSettings({ aiEnabled: v })}
            />
            <div className="rounded-xl border border-line bg-surface-2/50 p-3 text-[11px] leading-relaxed text-faint">
              <p className="mb-1.5 font-semibold text-ink">{t("set.connectLive")}</p>
              {t("set.envHint")}
              <pre className="mt-2 overflow-x-auto rounded-lg bg-surface p-2.5 text-[10px] leading-relaxed text-muted">
{`VITE_AI_API_KEY=your_key
VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
VITE_AI_MODEL=gpt-4o-mini`}
              </pre>
              {t("set.envNote")}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("set.language")} subtitle={t("set.languageHint")} icon={<Palette size={15} />} />
          <div className="flex flex-wrap items-center gap-3 p-4">
            <LanguageToggle />
            <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-faint">
              {t("set.languageHint")}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("set.data")} subtitle={t("set.dataSub")} icon={<Database size={15} />} />
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/40 px-3 py-2.5">
              <span className="text-[11px] text-faint">
                {t("set.storageUsed")} <span className="font-semibold text-ink">{t("set.storageKb", { n: formatNumber(storageSize) })}</span>
              </span>
              <span className="text-[11px] text-faint">
                {t("set.questsHabits", { q: formatNumber(data.quests.length), h: formatNumber(data.habits.length) })}
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = "";
              }}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" onClick={exportData}>
                <Download size={15} /> {t("set.export")}
              </Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload size={15} /> {t("set.import")}
              </Button>
            </div>
            <Button variant="secondary" block onClick={() => setConfirmDemo(true)}>
              <Sparkles size={15} /> {t("set.loadDemo")}
            </Button>
            <Button variant="danger" block onClick={() => setConfirmReset(true)}>
              <Trash2 size={15} /> {t("set.resetAll")}
            </Button>
          </div>
        </Card>

        <InstallCard className="lg:col-span-2" />

        <Card>
          <CardHeader title={t("set.privacy")} subtitle={t("set.privacySub")} icon={<Shield size={15} />} />
          <div className="space-y-2.5 p-4 text-[11px] leading-relaxed text-faint">
            <p>
              {t("set.privacy1")}
            </p>
            <p>
              {t("set.privacy2")}
            </p>
            <p>
              {t("set.privacy3", {
                q: formatNumber(data.quests.length),
                h: formatNumber(data.habits.length),
                g: formatNumber(data.goals.length),
                tx: formatNumber(data.transactions.length),
              })}
            </p>
            <Button size="sm" variant="secondary" onClick={() => navigate("character")}>
              {t("set.viewCharacter")}
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetAll}
        title={t("set.resetTitle")}
        message={t("set.resetBody")}
        confirmLabel={t("set.resetConfirm")}
      />
      <ConfirmDialog
        open={confirmDemo}
        onClose={() => setConfirmDemo(false)}
        onConfirm={() => {
          loadDemo();
          setNotice({ tone: "ok", text: t("set.demoLoaded") });
        }}
        title={t("set.demoTitle")}
        message={t("set.demoBody")}
        confirmLabel={t("set.demoConfirm")}
        danger={false}
      />
    </div>
  );
}

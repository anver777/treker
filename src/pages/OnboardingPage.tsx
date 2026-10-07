import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ImagePlus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Form";
import { useGame } from "@/store/GameContext";
import { useUI } from "@/store/UIContext";
import { Avatar } from "@/components/rpg/Avatar";
import { useI18n } from "@/i18n";

async function fileToAvatar(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });
  // Downscale so localStorage stays small
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      const min = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - min) / 2,
        (img.height - min) / 2,
        min,
        min,
        0,
        0,
        size,
        size,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function OnboardingPage() {
  const { startJourney } = useGame();
  const { navigate } = useUI();
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [withDemo, setWithDemo] = useState(true);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const begin = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("ob.err.name"));
      return;
    }
    startJourney({ name: trimmed, avatar, mainGoal: goal.trim(), withDemo });
    navigate("dashboard");
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(800px 500px at 50% -10%, var(--glow), transparent 70%), radial-gradient(600px 400px at 10% 110%, rgba(34,211,238,0.1), transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-[#04150e] shadow-[0_0_30px_-6px_var(--glow)]">
            <Sparkles size={26} strokeWidth={2.1} />
          </span>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.4em] text-accent">
            Life RPG
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            {step === 0 ? t("ob.welcome") : t("ob.createCharacter")}
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
            {step === 0
              ? t("ob.welcomeSub")
              : t("ob.createSub")}
          </p>
        </div>

        {step === 0 ? (
          <div className="space-y-3">
            {[
              { icon: "⚡", title: t("ob.earnXp"), text: t("ob.earnXpText") },
              { icon: "📈", title: t("ob.levelUp"), text: t("ob.levelUpText") },
              { icon: "🏆", title: t("ob.unlockAch"), text: t("ob.unlockAchText") },
            ].map((f) => (
              <div key={f.title} className="card-surface flex items-center gap-3 p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-lg">
                  {f.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{f.title}</p>
                  <p className="text-xs leading-relaxed text-faint">{f.text}</p>
                </div>
              </div>
            ))}
            <Button variant="primary" size="lg" block onClick={() => setStep(1)}>
              {t("ob.start")}
            </Button>
          </div>
        ) : (
          <div className="card-surface space-y-4 p-5">
            <div className="flex items-center gap-4">
              <Avatar src={avatar} name={name || "Player"} size={72} />
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setAvatar(await fileToAvatar(file));
                    } catch {
                      setError(t("ob.err.image"));
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                    <ImagePlus size={15} />
                    {t("ob.uploadAvatar")}
                  </Button>
                  {avatar ? (
                    <Button size="sm" variant="ghost" onClick={() => setAvatar(null)}>
                      <Trash2 size={15} />
                      {t("char.remove")}
                    </Button>
                  ) : null}
                </div>
                <p className="text-[11px] text-faint">{t("ob.avatarHint")}</p>
              </div>
            </div>

            <Field label={t("ob.characterName")} required error={error}>
              <TextInput value={name} onChange={(v) => setName(v)} placeholder={t("ob.characterName")} maxLength={32} />
            </Field>
            <Field label={t("ob.mainGoal")} hint={t("ob.mainGoalHint")}>
              <TextInput
                value={goal}
                onChange={(v) => setGoal(v)}
                placeholder={t("form.goalPlaceholder")}
                maxLength={80}
              />
            </Field>

            <button
              type="button"
              onClick={() => setWithDemo((v) => !v)}
              className="flex w-full items-start gap-3 rounded-xl border border-line bg-surface-2/60 p-3 text-left transition hover:border-line-strong"
              aria-pressed={withDemo}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                  withDemo ? "border-accent bg-accent text-[#04150e]" : "border-line-strong"
                }`}
              >
                {withDemo ? <Check size={13} strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{t("ob.demoTitle")}</span>
                <span className="block text-[11px] leading-relaxed text-faint">
                  {t("ob.demoText")}
                </span>
              </span>
            </button>

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setStep(0)}>
                {t("common.back")}
              </Button>
              <Button variant="primary" className="min-w-[160px] flex-1" onClick={begin}>
                {t("ob.enterGame")}
              </Button>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-faint">
          {t("app.onboardingNote")}
        </p>
      </motion.div>
    </div>
  );
}

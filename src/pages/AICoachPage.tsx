import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Send, Sparkles, User } from "lucide-react";
import { useGame } from "@/store/GameContext";
import {
  askCoach,
  isAIConfigured,
  promptTexts,
  weeklyReportText,
  type ChatMessage,
} from "@/services/aiService";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { levelInfo } from "@/lib/xp";
import { formatNumber, formatPercent } from "@/lib/format";
import { habitsOverview, lifeScore, questStats } from "@/lib/selectors";
import { todayISO } from "@/lib/date";
import { useI18n } from "@/i18n";

const STORAGE_KEY = "life-rpg.coach.v1";

export default function AICoachPage() {
  const { data } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ChatMessage[];
      return Array.isArray(parsed) ? parsed.slice(-30) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const configured = isAIConfigured();
  const { t } = useI18n();
  const prompts = promptTexts();

  const snapshot = useMemo(() => {
    const today = todayISO();
    const info = levelInfo(data.profile.totalXp);
    return {
      level: info.level,
      xp: data.profile.totalXp,
      lifeScore: lifeScore(data, today).score,
      habits: habitsOverview(data.habits, today),
      quests: questStats(data.quests, today),
    };
  }, [data]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* ignore quota errors — the chat is a convenience cache */
    }
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  const runWeeklyReport = () => {
    if (thinking) return;
    const text = weeklyReportText(data);
    setMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, role: "user", text: t("mx.analyzeWeek"), createdAt: new Date().toISOString() },
      {
        id: `c_${Date.now()}`,
        role: "coach",
        text,
        createdAt: new Date().toISOString(),
        source: "local",
      },
    ]);
  };

  const send = async (question: string) => {
    const text = question.trim();
    if (!text || thinking) return;
    setError("");
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);
    try {
      const { text: answer, source } = await askCoach({ question: text, data, history: messages });
      setMessages((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          role: "coach",
          text: answer,
          createdAt: new Date().toISOString(),
          source,
        },
      ]);
    } catch {
      setError(t("ai.error"));
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="stats-grid-4">
        {[
          { label: t("common.level"), value: formatNumber(snapshot.level) },
          { label: t("char.totalXp"), value: formatNumber(snapshot.xp) },
          { label: t("dash.lifeScore"), value: `${snapshot.lifeScore}/100` },
          { label: t("ai.habitRate"), value: formatPercent(snapshot.habits.rate, 0) },
        ].map((s) => (
          <div key={s.label} className="card-surface flex min-w-0 flex-col justify-between p-3.5">
            <p className="text-[10px] font-semibold uppercase leading-[1.25] tracking-[0.06em] text-faint [overflow-wrap:break-word]">
              {s.label}
            </p>
            <p className="mt-1.5 text-xl font-bold tabular text-ink [overflow-wrap:anywhere]">{s.value}</p>
          </div>
        ))}
      </div>

      <Card className="flex min-h-[60vh] flex-col">
        <CardHeader
          title="AI Coach"
          subtitle={configured ? t("ai.liveModel") : t("ai.onDevice")}
          icon={<Sparkles size={15} className="anim-sparkle" />}
          action={
            <span
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                configured
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-violet/40 bg-violet/10 text-violet"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-accent" : "bg-violet"}`} />
              {configured ? t("ai.api") : t("ai.local")}
            </span>
          }
        />

        {!configured ? (
          <div className="flex items-start gap-2.5 border-b border-line bg-violet/5 px-4 py-3">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-violet" />
            <p className="min-w-0 text-[11px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">{t("ai.notConfiguredTitle")}</span>{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-[10px] text-accent">
                VITE_AI_API_KEY
              </code>{" "}
              {"— "}
              {t("ai.notConfiguredBody")}
            </p>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          {messages.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={22} />}
              title={t("ai.askAnything")}
              description={t("ai.askHint")}
              className="py-10"
            />
          ) : (
            <ul className="space-y-3">
              {messages.map((m) => (
                <motion.li
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex min-w-0 gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}
                >
                  {m.role === "coach" ? (
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet/15 text-violet">
                      <Sparkles size={15} />
                    </span>
                  ) : null}
                  <div
                    className={`min-w-0 max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-accent/15 text-ink"
                        : "border border-line bg-surface-2/60 text-muted"
                    }`}
                  >
                    <Rich text={m.text} />
                    {m.role === "coach" && m.source ? (
                      <span className="mt-1.5 block text-[9px] uppercase tracking-[0.14em] text-faint">
                        {m.source === "api" ? t("ai.liveLabel") : t("ai.localLabel")}
                      </span>
                    ) : null}
                  </div>
                  {m.role === "user" ? (
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
                      <User size={15} />
                    </span>
                  ) : null}
                </motion.li>
              ))}
            </ul>
          )}

          {thinking ? (
            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet/15 text-violet">
                <Sparkles size={15} className="anim-sparkle" />
              </span>
              <span className="flex items-center gap-1 rounded-2xl border border-line bg-surface-2/60 px-3.5 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-violet"
                    style={{ animation: `lr-sparkle 1.1s ease-in-out ${i * 0.18}s infinite` }}
                  />
                ))}
              </span>
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
              {error}
            </p>
          ) : null}

          <div ref={endRef} />
        </div>

        <div className="shrink-0 border-t border-line p-3 pb-safe sm:p-4">
          <div className="mb-2.5 flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={runWeeklyReport}
              disabled={thinking}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-violet/50 bg-violet/10 px-3 py-1.5 text-[11px] font-semibold text-violet transition active:scale-95 disabled:opacity-40"
            >
              <Sparkles size={12} className="anim-sparkle" />
              {t("mx.analyzeWeek")}
            </button>
            {prompts.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={thinking}
                className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[11px] font-medium text-muted transition hover:border-violet/50 hover:text-violet disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={t("ai.placeholder")}
              aria-label={t("ai.placeholder")}
              className="max-h-28 min-h-[44px] w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-3 text-sm text-ink outline-none transition placeholder:text-faint focus:border-accent"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              aria-label={t("ai.send")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-[#04150e] transition active:scale-95 disabled:opacity-40"
            >
              <Send size={17} />
            </button>
          </form>
          {messages.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setMessages([]);
                setError("");
              }}
            >
              {t("ai.clearConversation")}
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

/** Minimal **bold** + line-break renderer (no external markdown dependency). */
function Rich({ text }: { text: string }) {
  const blocks = text.split("\n");
  return (
    <>
      {blocks.map((line, i) => (
        <span key={i} className="block">
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="font-semibold text-ink">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </span>
      ))}
    </>
  );
}

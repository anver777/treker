import { Suspense, lazy } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Sparkles } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

import { NotificationCenter } from "@/components/rpg/NotificationCenter";
import { GameFX } from "@/components/rpg/GameFX";
import { InstallBanner } from "@/components/pwa/Install";
import { ComposerHost } from "@/components/forms/ComposerModals";
import { useUI } from "@/store/UIContext";
import { LanguageToggle, useI18n } from "@/i18n";
import { useGame } from "@/store/GameContext";
import { habitsOverview } from "@/lib/selectors";
import { Skeleton } from "@/components/ui/Feedback";
import { OnboardingPage } from "@/pages/OnboardingPage";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const CharacterPage = lazy(() => import("@/pages/CharacterPage"));
const QuestsPage = lazy(() => import("@/pages/QuestsPage"));
const HabitsPage = lazy(() => import("@/pages/HabitsPage"));
const HabitMatrixPage = lazy(() => import("@/pages/HabitMatrixPage"));
const GoalsPage = lazy(() => import("@/pages/GoalsPage"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const AchievementsPage = lazy(() => import("@/pages/AchievementsPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const FinancePage = lazy(() => import("@/pages/FinancePage"));
const AICoachPage = lazy(() => import("@/pages/AICoachPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

const PAGES: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  character: CharacterPage,
  quests: QuestsPage,
  habits: HabitsPage,
  matrix: HabitMatrixPage,
  goals: GoalsPage,
  calendar: CalendarPage,
  achievements: AchievementsPage,
  analytics: AnalyticsPage,
  finance: FinancePage,
  coach: AICoachPage,
  settings: SettingsPage,
};

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function AppShell() {
  const { route, navigate } = useUI();
  const { t } = useI18n();
  const { data } = useGame();
  const streak = habitsOverview(data.habits).currentStreak;
  const title = t(`nav.${route}`) === `nav.${route}` ? t("nav.dashboard") : t(`nav.${route}`);
  const Page = PAGES[route] ?? DashboardPage;

  if (!data.onboarded) {
    return (
      <>
        <OnboardingPage />
        <GameFX />
      </>
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(900px 500px at 85% -10%, var(--glow), transparent 70%), radial-gradient(700px 420px at 5% 105%, rgba(34,211,238,0.08), transparent 70%)",
        }}
      />
      <Sidebar />

      <div className="md:pl-[68px] xl:pl-[240px]">
        <header
          className="sticky top-0 z-30 flex items-center gap-1.5 border-b border-line bg-bg/90 px-2.5 pt-safe backdrop-blur-xl sm:gap-3 sm:px-5"
          style={{ minHeight: "var(--header-h)" }}
        >
          <button
            onClick={() => navigate("dashboard")}
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-0.5 py-2 md:px-0"
            aria-label="LIFE RPG"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-[#04150e]">
              <Sparkles size={15} strokeWidth={2.3} />
            </span>
            <span className="text-[12px] font-bold tracking-[0.08em] text-ink sm:text-[13px] sm:tracking-[0.1em]">
              LIFE&nbsp;RPG
            </span>
          </button>

          <div className="hidden min-w-0 flex-1 md:block">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">{title}</h1>
            <p className="truncate text-[11px] text-faint">
              {data.profile.mainGoal || t("header.sub")}
            </p>
          </div>

          {/* right cluster: always fits, never pushes past the viewport */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {streak > 0 ? (
              <span
                className="flex h-11 min-w-[52px] shrink-0 items-center justify-center gap-1 rounded-xl border border-warning/30 bg-warning/10 px-2 text-xs font-semibold tabular text-warning sm:gap-1.5 sm:px-2.5"
                title={t("header.streak")}
              >
                <Flame size={14} className="shrink-0" />
                <span>{streak}</span>
                <span className="hidden lg:inline">{t("header.streak")}</span>
              </span>
            ) : null}
            <button
              onClick={() => navigate("coach")}
              className="hidden h-11 shrink-0 items-center gap-1.5 rounded-xl border border-violet/40 bg-violet/10 px-3 text-xs font-semibold text-violet transition hover:bg-violet/20 active:scale-95 xl:flex"
            >
              <Sparkles size={15} className="anim-sparkle" />
              <span className="truncate">{t("nav.coach")}</span>
            </button>
            <LanguageToggle />
            <NotificationCenter />
          </div>
        </header>

        <main
          className="mx-auto w-full max-w-[1600px] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+var(--content-bottom))] pt-3.5 sm:px-5 sm:pt-4 md:pb-10 lg:px-6"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={route}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Suspense fallback={<PageFallback />}>
                <Page />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <BottomNav />
      <InstallBanner />
      <ComposerHost />
      <GameFX />
    </div>
  );
}

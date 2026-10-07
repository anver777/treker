import { Flame, Sparkles } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav";
import { Avatar } from "@/components/rpg/Avatar";
import { useUI } from "@/store/UIContext";
import { useGame } from "@/store/GameContext";
import { levelInfo } from "@/lib/xp";
import { compactNumber } from "@/lib/format";
import { habitsOverview } from "@/lib/selectors";
import { cn } from "@/utils/cn";
import { tr } from "@/i18n";

export function Sidebar() {
  const { route, navigate } = useUI();
  const { data } = useGame();
  const info = levelInfo(data.profile.totalXp);
  const streak = habitsOverview(data.habits).currentStreak;

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-surface/80 backdrop-blur-xl md:flex md:w-[68px] xl:w-[240px]"
      aria-label={tr("app.tagline")}
    >
      <button
        onClick={() => navigate("dashboard")}
        className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-3 xl:px-4"
        aria-label="LIFE RPG home"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-[#04150e] shadow-[0_0_18px_-4px_var(--glow)]">
          <Sparkles size={17} strokeWidth={2.2} />
        </span>
        <span className="hidden min-w-0 text-left xl:block">
          <span className="block truncate text-[15px] font-bold tracking-[0.08em] text-ink">
            LIFE RPG
          </span>
          <span className="block truncate text-[10px] uppercase tracking-[0.18em] text-faint">
            {tr("app.tagline")}
          </span>
        </span>
      </button>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        <ul className="flex flex-col gap-0.5 px-2 xl:px-3">
          {NAV_ITEMS.map((item) => {
            const active = route === item.key;
            const IconCmp = item.icon;
            return (
              <li key={item.key}>
                <button
                  onClick={() => navigate(item.key)}
                  title={item.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 md:justify-center xl:justify-start",
                    active
                      ? "bg-accent/12 text-accent"
                      : "text-muted hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  {active ? (
                    <span className="absolute left-0 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent xl:block" />
                  ) : null}
                  <IconCmp size={19} strokeWidth={active ? 2.1 : 1.8} className="shrink-0" />
                  <span className="hidden truncate font-medium xl:inline">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-line p-2 xl:p-3">
        <button
          onClick={() => navigate("character")}
          className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition hover:bg-surface-2 md:flex-col xl:flex-row"
        >
          <Avatar src={data.profile.avatar} name={data.profile.name} size={38} />
          <span className="hidden min-w-0 flex-1 xl:block">
            <span className="flex items-center justify-between gap-1">
              <span className="truncate text-[13px] font-semibold text-ink">
                {data.profile.name || "Player"}
              </span>
              <span className="shrink-0 text-[10px] font-semibold tabular text-accent">
                L{info.level}
              </span>
            </span>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                style={{ width: `${info.progress}%` }}
              />
            </span>
            <span className="mt-1 flex items-center justify-between gap-1 text-[10px] text-faint">
              <span className="truncate tabular">{compactNumber(info.xpIntoLevel)}/{compactNumber(info.xpForNext)}</span>
              {streak > 0 ? (
                <span className="flex shrink-0 items-center gap-0.5 text-warning">
                  <Flame size={9} />
                  {streak}
                </span>
              ) : null}
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
}

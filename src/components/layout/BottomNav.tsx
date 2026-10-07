import { Plus, Sparkles } from "lucide-react";
import { MOBILE_NAV } from "@/components/layout/nav";
import { useUI } from "@/store/UIContext";
import { cn } from "@/utils/cn";
import { tr } from "@/i18n";

/* ============================================================
   Mobile bottom navigation
   ------------------------------------------------------------
   Layout rules:
   - `inset-x-0 bottom-0` + `box-sizing: border-box` so it never
     creates page-level horizontal scroll.
   - The raised "+" button is translated *inside* the nav's own
     padding box, so it cannot push past the screen edges.
   - Height is exposed as --bottom-nav-h and consumed by the page
     padding, so content is never hidden underneath.
   ============================================================ */

export function BottomNav() {
  const { route, navigate, openComposer } = useUI();

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 box-border border-t border-line bg-surface/95 pb-[calc(10px+env(safe-area-inset-bottom,0px))] backdrop-blur-xl md:hidden"
        style={{ height: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px))" }}
        aria-label={tr("nav.dashboard")}
      >
        <ul className="flex h-full w-full items-stretch justify-around gap-0.5 px-1">
          {MOBILE_NAV.slice(0, 2).map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={route === item.key}
              onClick={() => navigate(item.key)}
            />
          ))}

          {/* Quick add — sits INSIDE the bar so it can never cover page content */}
          <li className="flex shrink-0 items-center justify-center">
            <button
              onClick={() => openComposer("quest")}
              aria-label={tr("nav.quickAdd")}
              className="quick-add"
            >
              <Plus size={19} strokeWidth={2.6} />
            </button>
          </li>

          {MOBILE_NAV.slice(2).map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={route === item.key}
              onClick={() => navigate(item.key)}
            />
          ))}
        </ul>
      </nav>

      {/* Floating AI Coach — sits above the bar, never over content */}
      <button
        onClick={() => navigate("coach")}
        aria-label={tr("nav.coach")}
        className="fixed right-3 z-40 flex h-11 w-11 items-center justify-center gap-1.5 rounded-full border border-violet/40 bg-surface/95 px-0 text-xs font-semibold text-violet shadow-[0_8px_28px_-10px_rgba(167,139,250,0.5)] backdrop-blur transition active:scale-95 sm:w-auto sm:px-3.5 md:bottom-6 md:right-6"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + var(--bottom-nav-h) + var(--fab-gap))",
          height: "var(--fab-h)",
        }}
      >
        <Sparkles size={16} className="anim-sparkle shrink-0" />
        <span className="hidden truncate sm:inline">{tr("nav.coach")}</span>
      </button>
    </>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: (typeof MOBILE_NAV)[number];
  active: boolean;
  onClick: () => void;
}) {
  const IconCmp = item.icon;
  return (
    <li className="min-w-0 flex-1">
      <button
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-full min-h-[48px] w-full flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 transition active:scale-95",
          active ? "text-accent" : "text-faint",
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
            active ? "bg-accent/14" : "",
          )}
        >
          <IconCmp size={19} strokeWidth={active ? 2.1 : 1.8} />
        </span>
        <span className="w-full truncate text-[9.5px] font-medium leading-none">{item.shortLabel}</span>
      </button>
    </li>
  );
}

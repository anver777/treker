import { Plus, Sparkles } from "lucide-react";
import { MOBILE_NAV } from "@/components/layout/nav";
import { useUI } from "@/store/UIContext";
import { cn } from "@/utils/cn";
import { tr } from "@/i18n";

export function BottomNav() {
  const { route, navigate, openComposer } = useUI();

  return (
    <>
      <nav
        className="app-bottom-nav z-40 border-t border-line bg-surface/95 backdrop-blur-xl md:hidden"
        aria-label={tr("nav.dashboard")}
      >
        <ul className="mx-auto flex w-full max-w-lg items-center justify-between gap-0.5 px-1.5 pt-1.5 min-[380px]:gap-1 min-[380px]:px-2">
          {MOBILE_NAV.slice(0, 2).map((item) => (
            <NavButton key={item.key} item={item} active={route === item.key} onClick={() => navigate(item.key)} />
          ))}
          <li className="flex shrink-0 items-center justify-center self-center px-0.5">
            {/* 44px touch target, smaller 38px visual button inside */}
            <button
              type="button"
              onClick={() => openComposer("quest")}
              aria-label={tr("nav.quickAdd")}
              className="group flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl"
            >
              <span className="relative flex h-[38px] w-[38px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent to-accent-2 text-[#04150e] shadow-[0_4px_12px_-3px_rgba(47,230,164,0.45)] ring-1 ring-white/15 transition duration-150 group-hover:brightness-110 group-active:scale-90">
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/15" />
                <Plus size={19} strokeWidth={2.6} className="relative" />
              </span>
            </button>
          </li>
          {MOBILE_NAV.slice(2).map((item) => (
            <NavButton key={item.key} item={item} active={route === item.key} onClick={() => navigate(item.key)} />
          ))}
        </ul>
      </nav>

      {/* Floating AI button — available on every page */}
      <button
        type="button"
        onClick={() => navigate("coach")}
        aria-label={tr("nav.coach")}
        className="app-fab-ai z-40 flex h-11 min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border border-violet/40 bg-surface/92 px-3 text-xs font-semibold text-violet shadow-[0_8px_28px_-10px_rgba(167,139,250,0.5)] backdrop-blur transition active:scale-95"
      >
        <Sparkles size={15} className="anim-sparkle shrink-0" />
        <span className="hidden sm:inline">{tr("nav.coach")}</span>
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
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-[50px] w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition",
          active ? "text-accent" : "text-faint",
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
            active ? "bg-accent/14" : "",
          )}
        >
          <IconCmp size={18} strokeWidth={active ? 2.1 : 1.8} />
        </span>
        <span className="max-w-full truncate text-[10px] font-medium leading-tight">
          {item.shortLabel}
        </span>
      </button>
    </li>
  );
}

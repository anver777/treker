import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Home,
  Grid3x3,
  LayoutDashboard,
  ListChecks,
  Repeat,
  Settings,
  Sparkles,
  Target,
  Trophy,
  User,
} from "lucide-react";
import type { ComponentType } from "react";
import { tr } from "@/i18n";

export interface NavItem {
  key: string;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  mobile?: boolean;
}

/** Desktop + tablet navigation. Labels follow the active language. */
export const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    get label() {
      return navLabel("dashboard");
    },
    get shortLabel() {
      return navShort("home");
    },
    icon: LayoutDashboard,
    mobile: true,
  },
  {
    key: "character",
    get label() {
      return navLabel("character");
    },
    get shortLabel() {
      return navShort("profile");
    },
    icon: User,
    mobile: true,
  },
  {
    key: "quests",
    get label() {
      return navLabel("quests");
    },
    get shortLabel() {
      return navShort("quests");
    },
    icon: ListChecks,
    mobile: true,
  },
  {
    key: "habits",
    get label() {
      return navLabel("habits");
    },
    get shortLabel() {
      return navShort("habits");
    },
    icon: Repeat,
    mobile: true,
  },
  {
    key: "matrix",
    get label() {
      return navLabel("matrix");
    },
    get shortLabel() {
      return navShort("matrix");
    },
    icon: Grid3x3,
  },
  {
    key: "goals",
    get label() {
      return navLabel("goals");
    },
    get shortLabel() {
      return navShort("goals");
    },
    icon: Target,
  },
  {
    key: "calendar",
    get label() {
      return navLabel("calendar");
    },
    get shortLabel() {
      return navShort("calendar");
    },
    icon: CalendarDays,
  },
  {
    key: "achievements",
    get label() {
      return navLabel("achievements");
    },
    get shortLabel() {
      return navShort("achievements");
    },
    icon: Trophy,
  },
  {
    key: "analytics",
    get label() {
      return navLabel("analytics");
    },
    get shortLabel() {
      return navShort("stats");
    },
    icon: BarChart3,
  },
  {
    key: "finance",
    get label() {
      return navLabel("finance");
    },
    get shortLabel() {
      return navShort("finance");
    },
    icon: CreditCard,
  },
  {
    key: "coach",
    get label() {
      return navLabel("coach");
    },
    get shortLabel() {
      return navShort("coach");
    },
    icon: Sparkles,
  },
  {
    key: "settings",
    get label() {
      return navLabel("settings");
    },
    get shortLabel() {
      return navShort("settings");
    },
    icon: Settings,
  },
];

/** Compact mobile bottom bar. */
export const MOBILE_NAV: NavItem[] = [
  {
    key: "dashboard",
    get label() {
      return navShort("home");
    },
    get shortLabel() {
      return navShort("home");
    },
    icon: Home,
    mobile: true,
  },
  {
    key: "quests",
    get label() {
      return navShort("quests");
    },
    get shortLabel() {
      return navShort("quests");
    },
    icon: ListChecks,
    mobile: true,
  },
  {
    key: "habits",
    get label() {
      return navShort("habits");
    },
    get shortLabel() {
      return navShort("habits");
    },
    icon: Repeat,
    mobile: true,
  },
  {
    key: "analytics",
    get label() {
      return navShort("stats");
    },
    get shortLabel() {
      return navShort("stats");
    },
    icon: BarChart3,
    mobile: true,
  },
  {
    key: "character",
    get label() {
      return navShort("profile");
    },
    get shortLabel() {
      return navShort("profile");
    },
    icon: User,
    mobile: true,
  },
];

function navLabel(key: string): string {
  return tr(`nav.${key}`);
}

function navShort(key: string): string {
  return tr(`nav.${key}`);
}

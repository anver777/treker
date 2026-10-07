import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DICT, type Lang } from "@/i18n/dict";

/* ============================================================
   Lightweight i18n — Russian by default, English switchable.
   `tr()` reads module state so data dictionaries (stats, categories,
   achievements) can be translated without prop drilling.
   ============================================================ */

const STORAGE_KEY = "life-rpg.lang.v1";
const FALLBACK: Lang = "ru";

function readStored(): Lang {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "ru" || raw === "en") return raw;
    const nav = navigator.language?.slice(0, 2).toLowerCase();
    return nav === "ru" ? "ru" : "ru";
  } catch {
    return FALLBACK;
  }
}

let current: Lang = readStored();
const listeners = new Set<(l: Lang) => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(next: Lang) {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage unavailable — language still applies for this session */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
  }
  listeners.forEach((fn) => fn(next));
}

/** Translate a key. Supports `{var}` placeholders. */
export function tr(key: string, vars?: Record<string, string | number>): string {
  const table = DICT[current] || DICT[FALLBACK];
  let value = table[key] ?? DICT[FALLBACK][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return value;
}

/** Locale used for number formatting. */
export function numLocale(): string {
  return current === "ru" ? "ru-RU" : "en-US";
}

/** Locale used for date formatting. */
export function dateLocale(): string {
  return current === "ru" ? "ru-RU" : "en-US";
}

interface I18nApi {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: typeof tr;
}

const I18nContext = createContext<I18nApi | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);

  useEffect(() => {
    document.documentElement.lang = current;
    const fn = (l: Lang) => setLangState(l);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const value = useMemo<I18nApi>(
    () => ({
      lang,
      setLang: (l: Lang) => {
        setLang(l);
        setLangState(l);
      },
      t: tr,
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nApi {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Compact language toggle used in the header and settings. */
export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      className="flex h-11 min-h-[44px] shrink-0 items-center gap-0.5 rounded-xl border border-line bg-surface-2/60 p-1"
      role="group"
      aria-label={tr("lang.label")}
    >
      {(["ru", "en"] as Lang[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          title={code === "ru" ? "Русский" : "English"}
          className={
            compact
              ? `flex h-full min-w-[30px] items-center justify-center rounded-lg px-1.5 text-[11px] font-semibold uppercase transition ${
                  lang === code ? "bg-accent text-[#04150e]" : "text-muted hover:text-ink"
                }`
              : `flex h-full min-w-[32px] sm:min-w-[38px] items-center justify-center rounded-lg px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold uppercase transition ${
                  lang === code ? "bg-accent text-[#04150e]" : "text-muted hover:text-ink"
                }`
          }
        >
          {code}
        </button>
      ))}
    </div>
  );
}

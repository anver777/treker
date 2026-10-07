import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ComposerKind = "quest" | "habit" | "goal" | "income" | "expense";

export interface ComposerState {
  kind: ComposerKind;
  id?: string;
}

interface UIApi {
  route: string;
  navigate: (route: string) => void;
  composer: ComposerState | null;
  openComposer: (kind: ComposerKind, id?: string) => void;
  closeComposer: () => void;
  coachOpen: boolean;
  setCoachOpen: (v: boolean) => void;
}

const UIContext = createContext<UIApi | null>(null);

function readHash(fallback = "dashboard") {
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return raw || fallback;
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState(readHash);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);

  const navigate = useCallback((next: string) => {
    const target = `#/${next}`;
    if (window.location.hash !== target) {
      window.location.hash = target;
    } else {
      setRoute(next);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const onHash = useCallback(() => {
    setRoute(readHash());
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [onHash]);

  const openComposer = useCallback((kind: ComposerKind, id?: string) => {
    setComposer({ kind, id });
  }, []);
  const closeComposer = useCallback(() => setComposer(null), []);

  const value = useMemo(
    () => ({ route, navigate, composer, openComposer, closeComposer, coachOpen, setCoachOpen }),
    [route, navigate, composer, openComposer, closeComposer, coachOpen],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIApi {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside <UIProvider>");
  return ctx;
}

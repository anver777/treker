import { useEffect, useRef, useState } from "react";

/** Measures an element and keeps the width in sync — used to make charts fluid. */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

/** Simple hash router — works on any static host (Vercel, GitHub Pages, file://). */
export function useHashRoute(fallback = "dashboard") {
  const read = () => {
    const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0];
    return raw || fallback;
  };
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onHash = () => setRoute(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (next: string) => {
    if (read() === next) {
      setRoute(next);
      return;
    }
    window.location.hash = `/${next}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return { route, navigate };
}

/** Delayed flag used to reveal skeleton loaders on first paint. */
export function useBootDelay(ms = 420) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), ms);
    return () => window.clearTimeout(t);
  }, [ms]);
  return ready;
}

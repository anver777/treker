import { useEffect, useState } from "react";

/* ============================================================
   PWA runtime: install prompt, service worker, standalone mode.
   `initPwa()` runs before React renders so the one-shot
   `beforeinstallprompt` event is never missed.
   ============================================================ */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface PwaState {
  canInstall: boolean;
  installed: boolean;
  standalone: boolean;
  ios: boolean;
  android: boolean;
  online: boolean;
  offlineReady: boolean;
  persisted: boolean;
}

const DISMISS_KEY = "life-rpg.pwa.dismissed.v1";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let state: PwaState = {
  canInstall: false,
  installed: false,
  standalone: false,
  ios: false,
  android: false,
  online: true,
  offlineReady: false,
  persisted: false,
};
const listeners = new Set<(s: PwaState) => void>();

function setState(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches;
  return Boolean(iosStandalone || mq);
}

function detectIOS(): boolean {
  const ua = navigator.userAgent || "";
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/i.test(ua) || iPadOS;
}

function readEnvProd(): boolean {
  const env = (import.meta as unknown as { env?: { PROD?: boolean } }).env;
  return Boolean(env?.PROD);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!readEnvProd()) return; // keep dev server free of caching surprises
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    if (registration.active) setState({ offlineReady: true });
    navigator.serviceWorker.ready.then(() => setState({ offlineReady: true }));

    // Check for a new version whenever the app returns to the foreground
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") registration.update().catch(() => undefined);
    });
  } catch {
    /* registration failed (e.g. private mode) — the app still works online */
  }
}

async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return;
    const already = await navigator.storage.persisted?.();
    if (already) {
      setState({ persisted: true });
      return;
    }
    const granted = await navigator.storage.persist();
    setState({ persisted: Boolean(granted) });
  } catch {
    /* not supported */
  }
}

let initialised = false;

export function initPwa() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;

  setState({
    standalone: detectStandalone(),
    ios: detectIOS(),
    android: /android/i.test(navigator.userAgent || ""),
    online: navigator.onLine,
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    setState({ canInstall: true });
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    setState({ canInstall: false, installed: true });
  });

  window.addEventListener("online", () => setState({ online: true }));
  window.addEventListener("offline", () => setState({ online: false }));

  window.matchMedia?.("(display-mode: standalone)").addEventListener?.("change", () => {
    setState({ standalone: detectStandalone() });
  });

  if (document.readyState === "complete") {
    registerServiceWorker();
  } else {
    window.addEventListener("load", () => registerServiceWorker(), { once: true });
  }
  requestPersistentStorage();
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  const event = deferredPrompt;
  deferredPrompt = null;
  setState({ canInstall: false });
  try {
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") setState({ installed: true });
    return choice.outcome;
  } catch {
    return "dismissed";
  }
}

export function isBannerDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    // Show the banner again after 14 days
    return Date.now() - Number(raw) < 14 * 86400000;
  } catch {
    return false;
  }
}

export function dismissBanner() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function usePwa(): PwaState {
  const [value, setValue] = useState<PwaState>(state);
  useEffect(() => {
    const fn = (s: PwaState) => setValue(s);
    listeners.add(fn);
    setValue(state);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return value;
}

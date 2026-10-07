/* ============================================================
   LIFE RPG — PWA runtime
   ------------------------------------------------------------
   Handles: service worker registration, standalone detection,
   the native install prompt (Android/desktop) and iOS guidance.
   Every call degrades gracefully — the app is fully usable when
   install is unavailable (e.g. plain browser tab).
   ============================================================ */

export type InstallState =
  | "unsupported"
  | "installed"
  | "available"
  | "ios"
  | "waiting";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const listeners = new Set<(state: InstallState) => void>();
let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = "waiting";

function emit(next: InstallState) {
  if (state === next) return;
  state = next;
  listeners.forEach((fn) => fn(next));
}

/* ---------- Detection ---------- */

/** True when launched from the home screen (no browser chrome). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & {
    standalone?: boolean;
  };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    nav.standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPadOS 13+ reports as macOS but has touch points
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

export function isStandaloneSupported(): boolean {
  return typeof window !== "undefined" && "onbeforeinstallprompt" in window;
}

export function getInstallState(): InstallState {
  return state;
}

export function onInstallStateChange(fn: (state: InstallState) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/* ---------- Install ---------- */

let installAttempted = false;

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  installAttempted = true;
  try {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    emit(isStandalone() ? "installed" : "waiting");
    return choice.outcome;
  } catch {
    return "unavailable";
  }
}

export function wasInstallAttempted(): boolean {
  return installAttempted;
}

/* ---------- Service worker ---------- */

export function registerServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  // Only register over https/localhost — file:// and plain http will reject.
  if (!window.isSecureContext) return;
  const run = () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {
      /* offline shell unavailable — the app still works normally */
    });
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
}

/* ---------- Manifest fallback ------------------------------------------
   Some hosts serve only `index.html` (single-file bundle). When the real
   manifest.webmanifest is unreachable we swap in a Blob-based manifest so
   the app name, theme and icon still register. No user data is touched.
   ---------------------------------------------------------------------- */

const FALLBACK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#2fe6a4"/><stop offset="55%" stop-color="#5cf0bf"/><stop offset="100%" stop-color="#22d3ee"/></linearGradient></defs><rect width="512" height="512" fill="#06080b"/><g fill="none" stroke="url(#g)" stroke-linecap="round" stroke-linejoin="round"><path d="M104 332 L256 180 L408 332" stroke-width="48"/><path d="M152 408 L256 304 L360 408" stroke-width="42" opacity="0.72"/><circle cx="256" cy="132" r="23" stroke="none" fill="url(#g)"/></g></svg>`;

async function ensureManifest(): Promise<void> {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) return;
  try {
    const res = await fetch(link.href, { cache: "no-store" });
    if (res.ok) {
      await res.json();
      return; // real manifest is in place — nothing to do
    }
  } catch {
    /* fall through to the inline manifest */
  }
  const icon = `data:image/svg+xml,${encodeURIComponent(FALLBACK_ICON_SVG)}`;
  const base = `${location.origin}${location.pathname}`;
  const manifest = {
    id: "./",
    name: "LIFE RPG — Turn Your Life Into a Game",
    short_name: "LIFE RPG",
    description: "Моя жизнь — это игра.",
    start_url: base,
    scope: base,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#06080b",
    theme_color: "#06080b",
    icons: [
      { src: icon, sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: icon, sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: icon, sizes: "192x192", type: "image/svg+xml", purpose: "maskable" },
      { src: icon, sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }),
  );
  link.href = url;
}

/* ---------- Boot ---------- */

let booted = false;

export function initPWA(): () => void {
  if (booted || typeof window === "undefined") return () => undefined;
  booted = true;

  const resolve = () => {
    if (isStandalone()) emit("installed");
    else if (isIOS()) emit("ios");
    else if (deferred) emit("available");
    else if (isStandaloneSupported()) emit("waiting");
    else emit("unsupported");
  };

  const onPrompt = (event: Event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit("available");
  };
  const onInstalled = () => {
    deferred = null;
    emit("installed");
  };

  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  window.addEventListener("focus", resolve);

  resolve();
  registerServiceWorker();
  void ensureManifest();

  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
    window.removeEventListener("focus", resolve);
  };
}

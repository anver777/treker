/* ============================================================
   LIFE RPG — service worker
   ------------------------------------------------------------
   - The whole app is a single index.html (vite-plugin-singlefile),
     so caching the app shell = caching one file + icons.
   - Navigations: network-first (fresh deploys arrive immediately),
     falling back to the cached shell when offline.
   - Static same-origin files: cache-first with background refresh.
   - Cross-origin requests (e.g. the optional AI API) and non-GET
     requests are never touched.
   - User data lives in localStorage and is NEVER read or modified
     by this worker.
   ============================================================ */

const VERSION = "v1";
const CACHE = `life-rpg-shell-${VERSION}`;
const SHELL = "/index.html";
const PRECACHE = [
  "/",
  SHELL,
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          PRECACHE.map((url) =>
            cache.add(new Request(url, { cache: "reload" })).catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("life-rpg-shell-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

async function handleNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await Promise.race([fetch(request), timeout(4000)]);
    if (response && response.ok) {
      cache.put(SHELL, response.clone());
    }
    return response;
  } catch {
    const cached = (await cache.match(SHELL)) || (await cache.match("/"));
    if (cached) return cached;
    return new Response(
      "<!doctype html><meta charset='utf-8'><title>LIFE RPG</title><body style='background:#06080b;color:#e9eff6;font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0'><p>LIFE RPG: нет подключения. Откройте приложение один раз онлайн, чтобы включить офлайн-режим.</p></body>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

async function handleAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === "basic") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || new Response("", { status: 504 });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }
  event.respondWith(handleAsset(request));
});

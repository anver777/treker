/* ============================================================
   LIFE RPG — service worker
   Keeps the game playable offline and installable as a PWA.
   ============================================================ */

const VERSION = "life-rpg-v1";
const SHELL = `${VERSION}-shell`;

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/mark.svg",
  "./icons/mark-mono.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) =>
        Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App shell / navigation: network first so updates land quickly,
  // fall back to the cached shell for offline launches.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((cache) => cache.put("./index.html", copy));
          return res;
        })
        .catch(() =>
          caches
            .match("./index.html")
            .then((hit) => hit || caches.match("./") || Response.error()),
        ),
    );
    return;
  }

  // Everything else: cache first, refresh the cache in the background.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(SHELL).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => hit || Response.error());
    }),
  );
});

// Offline support: the whole app is a handful of static files, so we cache
// them all up front and serve them from the cache, refreshing each one in the
// background when there's a connection (stale-while-revalidate).
//
// Bump VERSION when files are added or removed below.

const VERSION = "v2";
const CACHE = `kijk-en-klik-${VERSION}`;

const APP_SHELL = [
  "./",
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "src/app.js",
  "src/content/hunts.js",
  "src/content/icons.js",
  "src/lib/camera.js",
  "src/lib/capture.js",
  "src/lib/image.js",
  "src/lib/nav.js",
  "src/lib/photos.js",
  "src/lib/recap.js",
  "src/lib/state.js",
  "src/lib/ui.js",
  "src/screens/board.js",
  "src/screens/camera.js",
  "src/screens/home.js",
  "src/screens/hunts.js",
  "src/screens/recap.js",
  "src/screens/shared.js",
  "fonts/fraunces-soft.woff2",
  "fonts/fraunces-italic.woff2",
  "fonts/figtree.woff2",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Any page navigation gets the app shell; routing happens in the hash.
  const key = request.mode === "navigate" ? "index.html" : request;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(key, { ignoreSearch: true });
      const refresh = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(key, response.clone());
          return response;
        })
        .catch(() => null);
      if (cached) {
        event.waitUntil(refresh);
        return cached;
      }
      return (await refresh) ?? Response.error();
    }),
  );
});

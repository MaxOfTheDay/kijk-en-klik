// Offline support: the whole app is a handful of static files, cached
// together per release and served cache-first, so one launch never mixes
// files from two versions.
//
// VERSION is stamped with the commit on deploy (.github/workflows/pages.yml)
// and with the start time by `npm start`, so every release is a new service
// worker. The browser installs it, it takes over, and the page reloads into
// the new version (see src/app.js). Add new files to APP_SHELL below.

const VERSION = "dev";
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
      // Straight from the network: GitHub Pages lets browsers keep files for
      // 10 minutes, and a new version must not be built from old files.
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" }))))
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
      return cached ?? fetch(request).catch(() => Response.error());
    }),
  );
});

# Kijk & Klik

A photo scavenger hunt for family walks. Pick a hunt, head outside, and snap each
discovery as you find it. The board fills up with your own photos, and you finish
with a recap of the walk.

- No accounts, no backend, no uploads. Photos stay on the device.
- Installable PWA that works offline once it has loaded.
- Plain HTML, CSS and ES modules. There is no build step and no runtime dependencies.

## Run it

```sh
npm start            # http://localhost:8080
```

Any static file server works. To try it on a phone, deploy the folder to any HTTPS
static host (GitHub Pages, Netlify, Cloudflare Pages…). Camera capture, service
workers and installation all need HTTPS (or `localhost`).

```sh
npm install          # dev only: Playwright, for tests and icon rendering
npm test             # end-to-end: play, reload, finish early, recap, offline
npm run icons        # re-render PNG icons from scripts/icon-art.mjs
```

## How it's put together

```
index.html               app shell
styles.css               the whole design system (hunts only change --accent)
manifest.webmanifest     PWA manifest
sw.js                    offline cache for the app shell and fonts
src/
  app.js                 routes → screens, service worker registration
  content/
    hunts.js             ALL hunt and challenge content, as data
    icons.js             hand-drawn line icons
  lib/
    state.js             hunt progress (small JSON in localStorage)
    photos.js            photo blobs + unsaved draft (IndexedDB)
    image.js             resize/re-encode photos, fix orientation
    capture.js           camera / photo library via the native file input
    nav.js               tiny hash router with a history "trail"
    recap.js             recap as plain data (ready for a future export)
    ui.js                toast, confirm dialog, haptics, escaping
  screens/               home, hunts (picker), board (+ sheet & preview), recap
```

Each layer has one job:

| Concern          | Where                    | Storage                         |
| ---------------- | ------------------------ | ------------------------------- |
| Hunt content     | `src/content/hunts.js`   | shipped with the app            |
| Active hunt      | `src/lib/state.js`       | localStorage (ids only)         |
| Photos           | `src/lib/photos.js`      | IndexedDB (blobs)               |
| Presentation     | `src/screens/*`, CSS     | none                            |
| Offline          | `sw.js`                  | Cache Storage                   |

### Adding or editing a hunt

Edit `src/content/hunts.js`. A hunt needs an `id`, `title`, `description`, a
`theme` (an icon key), an `accent` colour and about 8 `challenges`. The order of
the challenges sets the pacing and decides what "Try this next" suggests. Don't
rename `id`s after release, because saved progress refers to them. New icons go
in `src/content/icons.js`.

### Photos

- Taking a photo opens the phone's own camera app through
  `<input type="file" accept="image/*" capture>`. "Choose from photos" uses the
  same input without `capture`. On desktop the app leads with "Choose a photo".
- Each photo is decoded with its EXIF orientation applied, then saved twice: a
  1600px JPEG for the preview and recap, and a 640px thumbnail for the board.
  Together that is about 250–450 KB, so an 8–12 photo hunt uses a few MB.
- A photo that has been taken but not yet accepted is kept as a draft, so a
  refresh on the preview screen doesn't lose it.
- A challenge is marked complete only after its photo has been written to
  IndexedDB. If saving fails, the player sees a message and the challenge
  stays open.
- The app keeps one active hunt and one finished hunt (the "last walk").
  Starting a new hunt while one is in progress moves the old one to "last
  walk", so its photos aren't thrown away. Finishing another hunt replaces the
  last walk, and any photos no longer referenced are deleted. On the recap,
  players can press and hold a photo to save it to the phone.

### Designed to grow, not built yet

- **Story hunts**: each hunt has `mode: "open"`. A sequential mode would decide
  which cards are unlocked on the board. Nothing else depends on the order.
- **Other proof types**: every challenge has `proofType: "photo"`. The sheet is
  the only place that would branch on it.
- **Export/share of the recap**: `buildRecap()` returns plain data that is
  separate from how it is drawn.
- **History**: `state.js` stores full runs, so `last` could become a list.

## Browser support

Built for Android Chrome. It only uses features that iOS Safari also supports
(file input capture, `<dialog>`, IndexedDB blobs, `100dvh`, safe areas), but it
hasn't been tested on a real iPhone yet. It needs a browser from 2023 or later,
because it uses `color-mix()` and `:has()`.

# Kijk & Klik

A photo scavenger hunt for family walks. Pick a hunt, head outside, and snap each
discovery as you find it. The board fills up with your own photos, and you finish
with a recap of the walk.

The interface and all hunt content are in Dutch. This README is in English for
developers.

- No accounts, no backend, no uploads. Photos stay on the device.
- Installable PWA that works offline once it has loaded.
- Plain HTML, CSS and ES modules. There is no build step and no runtime dependencies.

## Run it

```sh
npm start            # http://localhost:8080
```

Any static file server works. Camera capture, service workers and installation
all need HTTPS (or `localhost`).

### Deploy

`.github/workflows/pages.yml` runs the tests and publishes the app to GitHub
Pages on every push to `main`. One-time setup: in the repo go to **Settings →
Pages → Build and deployment** and set **Source** to **GitHub Actions**. The app
uses relative paths, so it works at `https://<user>.github.io/kijk-en-klik/`.

```sh
npm install          # dev only: Playwright, for tests and icon rendering
npm test             # end-to-end: live camera, picker fallback, reload, recap, offline
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
    camera.js            live camera stream helpers (getUserMedia)
    capture.js           native "take or choose" file picker (fallback)
    nav.js               tiny hash router with a history "trail"
    recap.js             recap as plain data (ready for a future export)
    ui.js                toast, confirm dialog, haptics, escaping
  screens/               home, hunts (picker), board (+ sheet & preview),
                         camera (in-app viewfinder), recap
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

Edit `src/content/hunts.js`. Write prompts in short, natural Dutch that works
when read aloud to a 5–8 year old. A hunt needs an `id`, `title`, `description`, a
`theme` (an icon key), an `accent` colour and about 8 `challenges`. The order of
the challenges is the order of the cards on the board. Don't
rename `id`s after release, because saved progress refers to them. New icons go
in `src/content/icons.js`.

### Photos

- **Foto maken** opens an in-app camera (`getUserMedia`). It asks for the
  rear camera with `exact` and falls back to a preference when a device can't
  satisfy that. Every newly opened challenge starts from the rear camera; a
  switch to the selfie camera lasts only for that challenge's retakes. It shows a 3:4 viewfinder with the prompt on top, a shutter, and a
  button to switch cameras when there is more than one. The saved photo is
  exactly the frame shown in the viewfinder. The stream stops as soon as the
  camera closes or the app goes to the background.
- If the browser has no live camera, or the camera is refused or busy, the
  camera screen offers **Foto maken of kiezen** instead. That opens the native
  picker, where the phone lets you take a photo or choose one. After a refusal,
  the sheet goes straight to that option for the rest of the session. **Kies uit
  je foto's** is always there as a second option.
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
  last walk, and any photos no longer referenced are deleted. A hunt without
  photos never replaces the last walk: it just ends. Whenever a last walk with
  photos would be replaced, the confirm dialog says so first. On the recap,
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

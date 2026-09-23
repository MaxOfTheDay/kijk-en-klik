// App entry: wires routes to screens and registers the service worker.
// Screens are plain modules exporting `mount(root, route, app)`, which
// returns an optional `{ update(route), destroy() }`.

import { onRouteChange, parseRoute, go } from "./lib/nav.js";
import { getActive, getLast, foundCount, referencedPhotoIds } from "./lib/state.js";
import { getHunt } from "./content/hunts.js";
import { listPhotoIds, deletePhotos } from "./lib/photos.js";
import { toast } from "./lib/ui.js";
import * as home from "./screens/home.js";
import * as hunts from "./screens/hunts.js";
import * as board from "./screens/board.js";
import * as recap from "./screens/recap.js";

const SCREENS = { home, hunts, board, recap };
const root = document.getElementById("app");

// Shared, in-memory hand-offs between screens (never persisted).
const app = {
  justFound: null, // challenge id to animate on the board
  celebrate: false, // play the recap's arrival once, right after finishing
};

let current = { name: null, handle: null };

function guard(route) {
  if (route.name === "board") {
    const run = getActive();
    if (!run || !getHunt(run.huntId)) return "";
  }
  if (route.name === "recap") {
    const run = getLast();
    if (!run || !getHunt(run.huntId)) return "";
  }
  return null;
}

function render(route) {
  const redirect = guard(route);
  if (redirect !== null) {
    go(redirect, { replace: true });
    return;
  }
  if (current.name === route.name && current.handle?.update) {
    current.handle.update(route);
    return;
  }
  current.handle?.destroy?.();
  root.replaceChildren();
  current = { name: route.name, handle: SCREENS[route.name].mount(root, route, app) ?? null };
  if (!route.challengeId) window.scrollTo(0, 0);
}

function welcomeBack(route) {
  const run = getActive();
  const hunt = run && getHunt(run.huntId);
  const n = foundCount(run);
  if (hunt && n > 0 && (route.name === "home" || route.name === "board")) {
    toast(`Daar ben je weer! ${n} van ${hunt.challenges.length} al gevonden.`);
  }
}

// Remove photos that no saved hunt points at (e.g. left behind if the app
// was closed halfway through replacing a photo).
async function sweepOrphans() {
  try {
    const keep = referencedPhotoIds();
    const ids = await listPhotoIds();
    await deletePhotos(ids.filter((id) => !keep.has(id)));
  } catch {
    // Storage unavailable: nothing to sweep.
  }
}

onRouteChange(render);
const first = parseRoute();
render(first);
welcomeBack(first);
sweepOrphans();

// Updates: a new release installs a new service worker, which takes over
// right away. Reload into it when nothing is in progress: now if no layer
// is open, otherwise the next time the app goes to the background (a draft
// photo survives a reload). Installed apps are often resumed rather than
// relaunched, so also check for a release whenever the app comes back.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  let updatePending = false;
  const reloadIfIdle = () => {
    if (updatePending && (document.hidden || !document.querySelector("dialog[open]"))) location.reload();
  };
  let controlled = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // The very first worker taking control is an install, not an update.
    if (!controlled) return void (controlled = true);
    updatePending = true;
    reloadIfIdle();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        document.addEventListener("visibilitychange", () => {
          if (document.hidden) reloadIfIdle();
          else reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  });
}

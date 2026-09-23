// The hunt board, plus the layers that open over it:
//   challenge sheet  (#/hunt/<id>)         read the prompt, start the camera
//   in-app camera    (#/hunt/<id>/camera)  live viewfinder (screens/camera.js)
//   photo preview    (#/hunt/<id>/photo)   use it or take it again

import { getHunt, getChallenge } from "../content/hunts.js";
import { icon, opticalScale } from "../content/icons.js";
import { getActive, foundCount, recordFind, finishActive } from "../lib/state.js";
import { savePhoto, deletePhotos, newPhotoId, saveDraft, getDraft, clearDraft } from "../lib/photos.js";
import { processImage, UnreadableImageError } from "../lib/image.js";
import { pickPhoto } from "../lib/capture.js";
import { checkChallengePhoto, photoCheckAvailable } from "../lib/ai-check.js";
import { liveCameraSupported, liveCameraBlocked, checkCameraPermission } from "../lib/camera.js";
import { go, returnTo } from "../lib/nav.js";
import { esc, haptic, confirmDialog, reducedMotion } from "../lib/ui.js";
import { hydratePhotos, replacedWalkNote } from "./shared.js";
import { createCamera } from "./camera.js";

const CATEGORY_LABEL = {
  observation: "Goed kijken",
  nature: "Natuur",
  imagination: "Fantasie",
  creative: "Jij kiest",
  group: "Samen",
};

// Found photos sit on the board like pinned prints: a gentle, fixed tilt.
const TILTS = [-1.4, 1, -0.6, 1.3, -1, 0.7, -1.2, 0.5, -0.8, 1.1, -0.4, 0.9];

export function mount(root, route, app) {
  const run = getActive();
  const hunt = getHunt(run.huntId);
  let draft = null; // { challengeId, source: "live" | "picker", full, thumb, width, height, url, check }
  let busy = false;

  root.innerHTML = `
    <div class="board__bar" data-part="bar" style="--accent:${hunt.accent}" aria-hidden="true">
      <div class="board__bar-inner">
        <button class="icon-btn" data-action="home" aria-label="Terug naar start" tabindex="-1">${icon("back")}</button>
        <span class="board__bar-title">${esc(hunt.title)}</span>
        <span class="board__bar-count" data-part="bar-count"></span>
      </div>
    </div>
    <main class="screen board" style="--accent:${hunt.accent}">
      <header class="topbar">
        <button class="icon-btn" data-action="home" aria-label="Terug naar start">${icon("back")}</button>
      </header>
      <section class="board__head" data-part="head"></section>
      <section class="next" data-part="next" hidden></section>
      <div data-part="cards"></div>
      <footer class="board__foot" data-part="foot"></footer>
    </main>
    <dialog class="sheet" style="--accent:${hunt.accent}" aria-labelledby="sheet-title"></dialog>
    <dialog class="camera" style="--accent:${hunt.accent}" aria-labelledby="camera-title"></dialog>
    <dialog class="preview" style="--accent:${hunt.accent}" aria-labelledby="preview-title"></dialog>`;

  const sheet = root.querySelector(".sheet");
  const preview = root.querySelector(".preview");
  const cameraDialog = root.querySelector(".camera");
  const part = (name) => root.querySelector(`[data-part=${name}]`);
  const current = () => sheet.dataset.challenge;

  const camera = createCamera(cameraDialog, {
    onCapture: (frame) => develop(frame, "live", current()),
    onPick: () => pickAndDevelop(current(), { fromCamera: true }),
    onClose() {
      if (cameraDialog.dataset.quiet) return delete cameraDialog.dataset.quiet;
      returnTo(`hunt/${current()}`);
    },
  });
  checkCameraPermission();

  // Rendering -----------------------------------------------------------------

  function finds() {
    return getActive()?.finds ?? {};
  }

  function card(c, i) {
    const find = finds()[c.id];
    if (find) {
      return `
        <button class="card is-found" data-open="${esc(c.id)}" data-photo-frame style="--tilt:${TILTS[i % TILTS.length]}deg">
          <img class="card__photo" alt="" data-photo-id="${esc(find.photoId)}">
          <span class="card__stamp" aria-hidden="true">${icon("check", { size: 13 })}</span>
          <span class="card__label"><span class="card__title">${esc(c.title)}</span></span>
          <span class="visually-hidden">— gevonden</span>
        </button>`;
    }
    return `
      <button class="card" data-open="${esc(c.id)}">
        <span class="card__icon" aria-hidden="true" style="--optical:${opticalScale(c.icon)}">${icon(c.icon, { size: 38 })}</span>
        <span class="card__title">${esc(c.title)}</span>
        ${c.type === "together" ? `<span class="card__tag">Samen</span>` : ""}
        <span class="visually-hidden">— nog niet gevonden</span>
      </button>`;
  }

  // Progress is a count, not a position: the first n stops fill, whichever
  // challenges were found, so it never suggests which one comes next.
  function renderHead() {
    const n = foundCount(getActive());
    const total = hunt.challenges.length;
    const stops = hunt.challenges.map((_, i) => `<li class="${i < n ? "is-found" : ""}"></li>`).join("");
    part("head").innerHTML = `
      <p class="eyebrow">${icon(hunt.theme, { size: 16 })} ${esc(hunt.title)}</p>
      <h1 class="board__count" aria-live="polite">
        ${n === 0 ? `${total} dingen om te vinden` : `<span class="board__n">${n}</span> van ${total} gevonden`}
      </h1>
      <ol class="route" aria-hidden="true" style="--fill:${n ? (n - 1) / total : 0}">${stops}<li class="route__end">${icon("flag", { size: 16 })}</li></ol>`;
    part("bar-count").textContent = `${n}/${total}`;
  }

  // Two groups, each in challenge order: what is still open to choose from,
  // then what has been found. Neither order implies a "next" challenge.
  function renderCards() {
    const open = [];
    const found = [];
    hunt.challenges.forEach((c, i) => (finds()[c.id] ? found : open).push(`<li data-card="${esc(c.id)}">${card(c, i)}</li>`));
    part("cards").innerHTML = `
      ${open.length ? `
        <section class="board__group" aria-labelledby="open-title">
          <h2 id="open-title" class="group-note">Kies wat je wilt zoeken</h2>
          <ul class="grid">${open.join("")}</ul>
        </section>` : ""}
      ${found.length ? `
        <section class="board__group board__group--found" aria-labelledby="found-title">
          <h2 id="found-title" class="group-note">Jullie vondsten <span class="group-note__count">· ${found.length}</span></h2>
          <ul class="grid grid--found">${found.join("")}</ul>
        </section>` : ""}`;
    hydratePhotos(part("cards"));
  }

  // Only shown once the board is full. Until then the board itself is the
  // guide: every open card is visible and any of them is a fine next step.
  function renderNext() {
    const el = part("next");
    el.hidden = hunt.challenges.some((c) => !finds()[c.id]);
    if (!el.hidden) {
      el.innerHTML = `
        <h2 class="next__done-title">${icon("star", { size: 26, className: "next__star" })} Alles gevonden!</h2>
        <button class="btn btn--primary btn--big" data-action="finish">Klaar met zoeken ${icon("arrow")}</button>`;
    }
  }

  function renderFoot() {
    const n = foundCount(getActive());
    const total = hunt.challenges.length;
    const el = part("foot");
    if (n === total) {
      el.classList.remove("is-sticky");
      el.innerHTML = "";
      return;
    }
    // Quiet while nothing is found; once there is something to keep, it
    // stays within reach at the bottom of the screen while scrolling.
    el.classList.toggle("is-sticky", n > 0);
    el.innerHTML = `<button class="btn ${n > 0 ? "btn--pill" : "btn--quiet"}" data-action="finish">Klaar met zoeken</button>`;
  }

  renderHead();
  renderNext();
  renderCards();
  renderFoot();

  // A compact bar (back, hunt, n/total) appears only once the rich header
  // has scrolled out of view, so orientation is never more than a glance away.
  const bar = part("bar");
  const barBtn = bar.querySelector("button");
  const barWatch = new IntersectionObserver(([entry]) => {
    const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    bar.classList.toggle("is-visible", show);
    bar.setAttribute("aria-hidden", String(!show));
    barBtn.tabIndex = show ? 0 : -1;
  });
  barWatch.observe(part("head"));

  // Challenge sheet ---------------------------------------------------------

  // The live camera when the browser offers one; otherwise the native
  // "take or choose" picker, presented as a normal choice, not an error.
  const useLiveCamera = () => liveCameraSupported() && !liveCameraBlocked();

  function renderSheet(c, note = "") {
    const find = finds()[c.id];
    const live = useLiveCamera();
    const tag = c.type === "together" ? "Samen" : CATEGORY_LABEL[c.category] ?? "";
    sheet.dataset.challenge = c.id;
    sheet.dataset.live = String(live);
    const takeLabel = find ? "Nieuwe foto maken" : "Foto maken";
    const primary = live
      ? `<button class="btn ${find ? "btn--secondary" : "btn--primary btn--big"}" data-action="camera">${icon("camera")} ${takeLabel}</button>
         <button class="btn btn--quiet" data-action="library">${icon("image")} Kies uit je foto's</button>`
      : `<button class="btn ${find ? "btn--secondary" : "btn--primary btn--big"}" data-action="library">${icon("camera")} Foto maken of kiezen</button>`;
    sheet.innerHTML = `
      <div class="sheet__inner">
        <div class="sheet__top">
          ${tag ? `<span class="chip">${esc(tag)}</span>` : "<span></span>"}
          <button class="icon-btn" data-action="close" aria-label="Sluiten">${icon("close")}</button>
        </div>
        ${
          find
            ? `<div class="sheet__photo" data-photo-frame><img alt="Jullie foto bij: ${esc(c.title)}" data-photo-id="${esc(find.photoId)}" data-photo-size="full"><span class="sheet__stamp" aria-hidden="true">${icon("check", { size: 17 })}</span></div>`
            : `<span class="sheet__icon">${icon(c.icon, { size: 36 })}</span>`
        }
        <h2 id="sheet-title" class="sheet__title">${esc(c.title)}</h2>
        ${c.hint ? `<p class="sheet__hint">${esc(c.hint)}</p>` : ""}
        <p class="sheet__note" role="status">${esc(note)}</p>
        <div class="sheet__actions">
          ${find ? `<button class="btn btn--primary" data-action="close">Deze houden</button>` : ""}
          ${primary}
        </div>
      </div>`;
    hydratePhotos(sheet);
  }

  function setSheetNote(text) {
    const note = sheet.querySelector(".sheet__note");
    if (note) note.textContent = text;
  }

  function setBusy(on, label) {
    busy = on;
    sheet.querySelectorAll("button").forEach((b) => (b.disabled = on && b.dataset.action !== "close"));
    sheet.classList.toggle("is-busy", on);
    if (label !== undefined) setSheetNote(label);
  }

  // Turns a captured frame or picked file into a draft and shows the preview.
  async function develop(file, source, challengeId, { fromPreview = false } = {}) {
    const processed = await processImage(file);
    if (draft?.url) URL.revokeObjectURL(draft.url);
    draft?.check?.controller?.abort();
    draft = { huntId: hunt.id, challengeId, source, ...processed, url: URL.createObjectURL(processed.full) };
    // Keep a copy so a refresh on the preview doesn't lose the photo.
    saveDraft({ huntId: hunt.id, challengeId, source, ...processed }).catch(() => {});
    if (fromPreview) renderPreview(getChallenge(hunt, challengeId));
    else go(`hunt/${challengeId}/photo`);
  }

  async function pickAndDevelop(challengeId, { fromPreview = false, fromCamera = false } = {}) {
    if (busy) return;
    const file = await pickPhoto();
    if (!file) return;
    const layer = fromPreview ? preview : fromCamera ? cameraDialog : sheet;
    layer.classList.add("is-busy");
    if (fromCamera) camera.setStatus("Foto wordt ontwikkeld…");
    else if (!fromPreview) setBusy(true, "Foto wordt ontwikkeld…");
    try {
      await develop(file, "picker", challengeId, { fromPreview });
    } catch (err) {
      const message =
        err instanceof UnreadableImageError
          ? "Deze foto kon niet worden geopend. Probeer een andere."
          : "Er ging iets mis met deze foto. Probeer het nog eens.";
      if (fromPreview) setPreviewError(message);
      else if (fromCamera) camera.setStatus(message);
      else setSheetNote(message);
    } finally {
      layer.classList.remove("is-busy");
      if (!fromPreview && !fromCamera) setBusy(false);
    }
  }

  // Preview -------------------------------------------------------------------

  function renderPreview(c) {
    startCheck(c);
    preview.innerHTML = `
      <div class="preview__frame">
        <img src="${draft.url}" alt="Voorbeeld van jullie foto bij: ${esc(c.title)}">
      </div>
      <div class="preview__bar">
        <p id="preview-title" class="preview__label">${esc(c.title)}</p>
        <p class="preview__check" role="status"></p>
        <p class="preview__error" role="alert"></p>
        <div class="preview__actions"></div>
      </div>`;
    renderCheck();
  }

  // Photo check: a soft second opinion shown on the preview. It runs once per
  // draft, never disables the buttons, and when there is no answer (offline,
  // slow, failed) the preview simply stays as it always was.
  const CHECK_TEXT = {
    pending: "Even kijken…",
    YES: "Gevonden!",
    UNSURE: "Dat zou kunnen! Vind jij dat het telt?",
    NO: "Hmm… misschien nog even verder zoeken?",
  };

  function startCheck(c) {
    if (draft.check || !photoCheckAvailable()) return;
    const d = draft;
    const controller = new AbortController();
    d.check = { state: "pending", controller };
    checkChallengePhoto({ challenge: c.title, image: d.full, signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      d.check = { state: result ?? "none" };
      if (draft === d && preview.open) {
        renderCheck();
        if (result === "YES") haptic(12);
      }
    });
  }

  function renderCheck() {
    const state = draft?.check?.state ?? "none";
    const line = preview.querySelector(".preview__check");
    line.dataset.state = state;
    line.innerHTML = CHECK_TEXT[state] ? `${state === "YES" ? icon("check", { size: 18 }) : ""}${esc(CHECK_TEXT[state])}` : "";
    // Same two buttons in the same places; only the wording, and for a "no"
    // the emphasis, follows the check. Keeping the photo is always one tap.
    const [retakeLabel, useLabel] = state === "UNSURE" ? ["Nieuwe foto", "Ja, gebruiken"] : state === "NO" ? ["Opnieuw zoeken", "Toch gebruiken"] : ["Opnieuw", "Deze houden"];
    const [retakeStyle, useStyle] = state === "NO" ? ["btn--primary btn--light", "btn--on-dark"] : ["btn--on-dark", "btn--primary btn--light"];
    const actions = preview.querySelector(".preview__actions");
    actions.classList.toggle("is-even", state === "UNSURE" || state === "NO");
    actions.innerHTML = `
      <button class="btn ${retakeStyle}" data-action="retake">${icon("retake")} ${retakeLabel}</button>
      <button class="btn ${useStyle}" data-action="use">${icon("check")} ${useLabel}</button>`;
  }

  function setPreviewError(text) {
    preview.querySelector(".preview__error").textContent = text;
  }

  function retake() {
    if (busy || !draft) return;
    if (draft.source === "live") returnTo(`hunt/${draft.challengeId}/camera`);
    else pickAndDevelop(draft.challengeId, { fromPreview: true });
  }

  async function usePhoto() {
    if (busy || !draft) return;
    busy = true;
    preview.classList.add("is-busy");
    const { challengeId } = draft;
    const id = newPhotoId();
    const fail = (message) => {
      busy = false;
      preview.classList.remove("is-busy");
      setPreviewError(message);
    };
    try {
      await savePhoto({ id, full: draft.full, thumb: draft.thumb, width: draft.width, height: draft.height });
    } catch {
      return fail("Deze foto kon niet worden bewaard. Misschien is je telefoon vol: maak wat ruimte vrij en probeer het opnieuw.");
    }
    let replaced;
    try {
      replaced = recordFind(challengeId, id);
    } catch {
      deletePhotos([id]).catch(() => {});
      return fail("Je voortgang kon niet worden bewaard. Probeer het opnieuw.");
    }
    if (replaced) deletePhotos([replaced]).catch(() => {});
    discardDraft();
    busy = false;
    preview.classList.remove("is-busy");
    app.justFound = challengeId;
    haptic([12, 60, 18]);
    returnTo("hunt");
  }

  function discardDraft() {
    if (draft?.url) URL.revokeObjectURL(draft.url);
    draft?.check?.controller?.abort();
    draft = null;
    clearDraft().catch(() => {});
  }

  // Layers & routing ----------------------------------------------------------

  // Close a dialog ourselves without treating it as a user "back".
  function closeQuietly(dialog) {
    if (!dialog.open) return;
    dialog.dataset.quiet = "1";
    dialog.close();
  }

  // Esc, Android back on a dialog, or a backdrop tap: follow with navigation.
  sheet.addEventListener("close", () => {
    if (sheet.dataset.quiet) return delete sheet.dataset.quiet;
    returnTo("hunt");
  });
  preview.addEventListener("close", () => {
    if (preview.dataset.quiet) return delete preview.dataset.quiet;
    const id = draft?.challengeId ?? current();
    returnTo(draft?.source === "live" ? `hunt/${id}/camera` : `hunt/${id}`);
  });
  sheet.addEventListener("click", (e) => {
    if (e.target === sheet && !busy) sheet.close();
  });

  function ensureSheet(c) {
    // A challenge opened afresh always starts from the rear camera.
    if (current() !== c.id) camera.resetFacing();
    // Re-render when the camera turned out to be unavailable in the meantime.
    if (!sheet.open || current() !== c.id || sheet.dataset.live !== String(useLiveCamera())) renderSheet(c);
    if (!sheet.open) sheet.showModal();
  }

  async function applyRoute(r) {
    const c = r.challengeId ? getChallenge(hunt, r.challengeId) : null;
    if (r.challengeId && !c) return go("hunt", { replace: true });

    if (r.preview) {
      if (!draft || draft.challengeId !== c.id) {
        const saved = await getDraft().catch(() => null);
        if (saved && saved.challengeId === c.id && saved.huntId === hunt.id) {
          draft = { ...saved, url: URL.createObjectURL(saved.full) };
        } else {
          return go(`hunt/${c.id}`, { replace: true });
        }
      }
      ensureSheet(c);
      closeQuietly(cameraDialog); // stops the stream
      renderPreview(c);
      if (!preview.open) preview.showModal();
      return;
    }

    closeQuietly(preview);

    if (r.camera) {
      ensureSheet(c);
      if (!liveCameraSupported()) return go(`hunt/${c.id}`, { replace: true });
      if (!cameraDialog.open) {
        if (liveCameraBlocked()) camera.openFallback(c);
        else camera.open(c);
      }
      return;
    }

    closeQuietly(cameraDialog);
    if (c) {
      ensureSheet(c);
      return;
    }

    // Plain board.
    closeQuietly(sheet);
    delete sheet.dataset.challenge;
    if (draft) discardDraft();
    if (app.justFound) celebrateFind(app.justFound);
  }

  // After a find: progress ticks up at once; the card fades out of the open
  // grid and the rest glide into place; the print lands in the collection
  // when the player scrolls down to it. The page never jumps away from
  // where they are.
  const LEAVE_MS = 220;
  let pendingLand = null;

  function celebrateFind(id) {
    app.justFound = null;
    const sel = `[data-card="${CSS.escape(id)}"]`;
    const leaving = root.querySelector(`.grid:not(.grid--found) ${sel} .card`);
    renderHead();
    const head = root.querySelector(".board__head");
    head.classList.add("is-updated");
    bar.classList.add("is-updated");
    if (leaving) head.querySelectorAll(".route li")[foundCount(getActive()) - 1]?.classList.add("is-new");
    setTimeout(() => {
      head.classList.remove("is-updated");
      bar.classList.remove("is-updated");
    }, 1200);

    const settle = () => {
      const before = new Map([...root.querySelectorAll(".grid:not(.grid--found) [data-card]")].map((li) => [li.dataset.card, li.getBoundingClientRect()]));
      renderNext();
      renderCards();
      renderFoot();
      if (leaving) root.querySelector(".group-note__count")?.classList.add("is-new");
      if (!reducedMotion()) glide(before);
      landWhenSeen(root.querySelector(`${sel} .card`));
    };
    if (leaving && !reducedMotion()) {
      leaving.classList.add("is-leaving");
      setTimeout(settle, LEAVE_MS);
    } else settle();
  }

  // FLIP: start each remaining open card where it was, then let it settle.
  function glide(before) {
    for (const li of root.querySelectorAll(".grid:not(.grid--found) [data-card]")) {
      const from = before.get(li.dataset.card);
      if (!from) continue;
      const to = li.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (!dx && !dy) continue;
      li.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
    }
  }

  // Play the landing once the new print is actually on screen.
  function landWhenSeen(btn) {
    pendingLand?.disconnect();
    if (!btn) return;
    pendingLand = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      pendingLand.disconnect();
      pendingLand = null;
      btn.classList.add("is-new");
    }, { threshold: 0.6 });
    pendingLand.observe(btn);
  }

  // Actions -----------------------------------------------------------------

  async function finish() {
    const n = foundCount(getActive());
    const total = hunt.challenges.length;
    const replaced = replacedWalkNote();
    // A full board goes straight to the recap, unless a saved walk would go.
    if (n < total || replaced) {
      const kept = n === 0 ? "Geeft niks. Er komt vast nog een wandeling." : n === 1 ? "Jullie foto gaat in het overzicht." : `Jullie ${n} foto's gaan in het overzicht.`;
      const ok = await confirmDialog({
        title: n === total ? "Alles gevonden!" : "Klaar voor vandaag?",
        body: [n === total ? "" : kept, replaced].join(" ").trim(),
        confirm: "Klaar!",
        cancel: n === total ? "Nog niet" : "Verder zoeken",
      });
      if (!ok) return;
    }
    let orphans;
    try {
      orphans = finishActive();
    } catch {
      return;
    }
    deletePhotos(orphans).catch(() => {});
    // Nothing found: the empty hunt simply ends; there is no recap to show.
    if (n === 0) return go("", { replace: true });
    haptic([20, 80, 20, 80, 30]);
    app.celebrate = true;
    go("recap", { replace: true });
  }

  function onClick(e) {
    // The camera handles its own buttons.
    if (cameraDialog.contains(e.target)) return;
    const opener = e.target.closest("[data-open]");
    if (opener && !sheet.open) {
      haptic(8);
      return go(`hunt/${opener.dataset.open}`);
    }
    const action = e.target.closest("[data-action]")?.dataset.action;
    switch (action) {
      case "home":
        return returnTo("");
      case "finish":
        return finish();
      case "close":
        if (!busy) sheet.close();
        return;
      case "camera":
        if (!busy) go(`hunt/${current()}/camera`);
        return;
      case "library":
        return pickAndDevelop(current());
      case "retake":
        return retake();
      case "use":
        return usePhoto();
    }
  }

  root.addEventListener("click", onClick);
  applyRoute(route);

  return {
    update: applyRoute,
    destroy() {
      root.removeEventListener("click", onClick);
      barWatch.disconnect();
      pendingLand?.disconnect();
      camera.destroy();
      if (draft?.url) URL.revokeObjectURL(draft.url);
      draft?.check?.controller?.abort();
    },
  };
}

// The hunt board, plus the two layers that open over it:
//   challenge sheet  (#/hunt/<id>)        read the prompt, take a photo
//   photo preview    (#/hunt/<id>/photo)  use it or retake it

import { getHunt, getChallenge } from "../content/hunts.js";
import { icon } from "../content/icons.js";
import { getActive, foundCount, recordFind, finishActive } from "../lib/state.js";
import { savePhoto, deletePhotos, newPhotoId, saveDraft, getDraft, clearDraft } from "../lib/photos.js";
import { processImage, UnreadableImageError } from "../lib/image.js";
import { pickPhoto, canTakePhoto } from "../lib/capture.js";
import { go, returnTo } from "../lib/nav.js";
import { esc, haptic, confirmDialog, reducedMotion } from "../lib/ui.js";
import { hydratePhotos } from "./shared.js";

const CATEGORY_LABEL = {
  observation: "Look closely",
  nature: "Nature",
  imagination: "Imagine",
  creative: "Your choice",
  group: "Together",
};

export function mount(root, route, app) {
  const run = getActive();
  const hunt = getHunt(run.huntId);
  let draft = null; // { challengeId, source, full, thumb, width, height, url }
  let busy = false;

  root.innerHTML = `
    <main class="screen board" style="--accent:${hunt.accent}">
      <header class="topbar">
        <button class="icon-btn" data-action="home" aria-label="Back to home">${icon("back")}</button>
        <span class="topbar__mark" aria-hidden="true">${icon(hunt.theme)}</span>
      </header>
      <section class="board__head" data-part="head"></section>
      <section class="next" data-part="next"></section>
      <section class="board__grid" aria-labelledby="grid-title">
        <h2 id="grid-title" class="section-label">The board</h2>
        <ul class="grid">
          ${hunt.challenges.map((c, i) => `<li data-card="${esc(c.id)}">${card(c, i)}</li>`).join("")}
        </ul>
      </section>
      <footer class="board__foot" data-part="foot"></footer>
    </main>
    <dialog class="sheet" style="--accent:${hunt.accent}" aria-labelledby="sheet-title"></dialog>
    <dialog class="preview" aria-labelledby="preview-title"></dialog>`;

  const sheet = root.querySelector(".sheet");
  const preview = root.querySelector(".preview");
  const part = (name) => root.querySelector(`[data-part=${name}]`);

  // Rendering -----------------------------------------------------------------

  function finds() {
    return getActive()?.finds ?? {};
  }

  function card(c, i) {
    const find = finds()[c.id];
    const num = String(i + 1).padStart(2, "0");
    if (find) {
      return `
        <button class="card is-found" data-open="${esc(c.id)}" data-photo-frame>
          <img class="card__photo" alt="" data-photo-id="${esc(find.photoId)}">
          <span class="card__label">
            <span class="card__check">${icon("check", { size: 14 })}</span>
            <span class="card__title">${esc(c.title)}</span>
          </span>
          <span class="visually-hidden">— found</span>
        </button>`;
    }
    return `
      <button class="card" data-open="${esc(c.id)}">
        <span class="card__num">${num}</span>
        <span class="card__icon">${icon(c.icon, { size: 28 })}</span>
        <span class="card__title">${esc(c.title)}</span>
        ${c.type === "together" ? `<span class="card__tag">Together</span>` : ""}
        <span class="visually-hidden">— not found yet</span>
      </button>`;
  }

  function renderHead() {
    const n = foundCount(getActive());
    const total = hunt.challenges.length;
    const ticks = hunt.challenges.map((c) => `<li class="${finds()[c.id] ? "is-found" : ""}"></li>`).join("");
    part("head").innerHTML = `
      <p class="eyebrow">${esc(hunt.title)}</p>
      <h1 class="board__count" aria-live="polite">
        ${n === 0 ? `${total} things to find` : `<span class="board__n">${n}</span> of ${total} found`}
      </h1>
      ${n === 0 ? `<p class="board__lede">Start anywhere. The board fills up with your photos as you go.</p>` : ""}
      <ol class="ticks" aria-hidden="true">${ticks}</ol>`;
  }

  function renderNext() {
    const next = hunt.challenges.find((c) => !finds()[c.id]);
    const el = part("next");
    if (!next) {
      el.className = "next next--done";
      el.innerHTML = `
        <p class="eyebrow">${icon("check", { size: 16 })} Every discovery found</p>
        <h2 class="next__done-title">The board is full.</h2>
        <button class="btn btn--primary btn--big" data-action="finish">See your board ${icon("arrow")}</button>`;
      return;
    }
    el.className = "next";
    el.innerHTML = `
      <p class="eyebrow">Try this next</p>
      <button class="next__card" data-open="${esc(next.id)}">
        <span class="next__icon">${icon(next.icon, { size: 32 })}</span>
        <span class="next__title">${esc(next.title)}</span>
        <span class="next__cta">Take a look ${icon("arrow", { size: 18 })}</span>
      </button>`;
  }

  function renderFoot() {
    const n = foundCount(getActive());
    const total = hunt.challenges.length;
    const el = part("foot");
    if (n === total) {
      el.innerHTML = "";
      return;
    }
    // Quiet at first; more present once half the board is filled.
    const style = n >= Math.ceil(total / 2) ? "btn--secondary" : "btn--quiet";
    el.innerHTML = `<button class="btn ${style}" data-action="finish">Finish hunt</button>`;
  }

  function refreshCard(id) {
    const li = root.querySelector(`[data-card="${CSS.escape(id)}"]`);
    const index = hunt.challenges.findIndex((c) => c.id === id);
    li.innerHTML = card(hunt.challenges[index], index);
    return li;
  }

  renderHead();
  renderNext();
  renderFoot();
  hydratePhotos(root);

  // Challenge sheet ---------------------------------------------------------

  function renderSheet(c, note = "") {
    const find = finds()[c.id];
    const camera = canTakePhoto();
    const tag = c.type === "together" ? "Together" : CATEGORY_LABEL[c.category] ?? "";
    const num = hunt.challenges.indexOf(c) + 1;
    const noteText = note || (!camera ? "Camera isn't available here. Choose a photo instead." : "");
    sheet.dataset.challenge = c.id;
    sheet.innerHTML = `
      <div class="sheet__inner">
        <div class="sheet__top">
          <span class="chip">No. ${num}${tag ? ` · ${esc(tag)}` : ""}</span>
          <button class="icon-btn" data-action="close" aria-label="Close">${icon("close")}</button>
        </div>
        ${
          find
            ? `<div class="sheet__photo" data-photo-frame><img alt="Your photo for: ${esc(c.title)}" data-photo-id="${esc(find.photoId)}" data-photo-size="full"></div>`
            : `<span class="sheet__icon">${icon(c.icon, { size: 36 })}</span>`
        }
        <h2 id="sheet-title" class="sheet__title">${esc(c.title)}</h2>
        ${c.hint ? `<p class="sheet__hint">${esc(c.hint)}</p>` : ""}
        <p class="sheet__note" role="status">${esc(noteText)}</p>
        <div class="sheet__actions">
          ${
            find
              ? `
            <button class="btn btn--primary" data-action="close">Keep this photo</button>
            ${camera ? `<button class="btn btn--secondary" data-action="camera">${icon("camera")} Take a new photo</button>` : ""}
            <button class="btn ${camera ? "btn--quiet" : "btn--secondary"}" data-action="library">${icon("image")} Choose from photos</button>`
              : camera
                ? `
            <button class="btn btn--primary btn--big" data-action="camera">${icon("camera")} Take photo</button>
            <button class="btn btn--quiet" data-action="library">${icon("image")} Choose from photos</button>`
                : `<button class="btn btn--primary btn--big" data-action="library">${icon("image")} Choose a photo</button>`
          }
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

  async function capture(challengeId, source, { fromPreview = false } = {}) {
    if (busy) return;
    const file = await pickPhoto(source);
    if (!file) {
      if (!fromPreview && source === "camera") {
        setSheetNote("No photo yet. If the camera didn't open, your browser may need camera permission — or choose a photo instead.");
      }
      return;
    }
    const layer = fromPreview ? preview : sheet;
    layer.classList.add("is-busy");
    if (!fromPreview) setBusy(true, "Developing your photo…");
    try {
      const processed = await processImage(file);
      if (draft?.url) URL.revokeObjectURL(draft.url);
      draft = { huntId: hunt.id, challengeId, source, ...processed, url: URL.createObjectURL(processed.full) };
      // Keep a copy so a refresh on the preview doesn't lose the photo.
      saveDraft({ huntId: hunt.id, challengeId, source, ...processed }).catch(() => {});
      if (fromPreview) renderPreview(getChallenge(hunt, challengeId));
      else go(`hunt/${challengeId}/photo`);
    } catch (err) {
      const message =
        err instanceof UnreadableImageError
          ? "That photo couldn't be opened. Try taking a new one, or pick a different photo."
          : "Something went wrong reading that photo. Please try again.";
      if (fromPreview) setPreviewError(message);
      else setSheetNote(message);
    } finally {
      layer.classList.remove("is-busy");
      if (!fromPreview) setBusy(false);
    }
  }

  // Preview -------------------------------------------------------------------

  function renderPreview(c) {
    preview.innerHTML = `
      <div class="preview__frame">
        <img src="${draft.url}" alt="Preview of your photo for: ${esc(c.title)}">
      </div>
      <div class="preview__bar">
        <p id="preview-title" class="preview__label">${esc(c.title)}</p>
        <p class="preview__error" role="alert"></p>
        <div class="preview__actions">
          <button class="btn btn--on-dark" data-action="retake">${icon("retake")} ${draft.source === "camera" ? "Retake" : "Choose again"}</button>
          <button class="btn btn--primary btn--light" data-action="use">${icon("check")} Use photo</button>
        </div>
      </div>`;
  }

  function setPreviewError(text) {
    preview.querySelector(".preview__error").textContent = text;
  }

  async function usePhoto() {
    if (busy || !draft) return;
    busy = true;
    preview.classList.add("is-busy");
    const { challengeId } = draft;
    const id = newPhotoId();
    try {
      await savePhoto({ id, full: draft.full, thumb: draft.thumb, width: draft.width, height: draft.height });
    } catch {
      busy = false;
      preview.classList.remove("is-busy");
      setPreviewError("We couldn't save this photo — your phone may be low on storage. Free up a little space and try again.");
      return;
    }
    let replaced;
    try {
      replaced = recordFind(challengeId, id);
    } catch {
      deletePhotos([id]).catch(() => {});
      busy = false;
      preview.classList.remove("is-busy");
      setPreviewError("We couldn't save your progress. Please try again.");
      return;
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
    const id = draft?.challengeId;
    returnTo(id ? `hunt/${id}` : "hunt");
  });
  sheet.addEventListener("click", (e) => {
    if (e.target === sheet && !busy) sheet.close();
  });

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
      if (!sheet.open) {
        renderSheet(c);
        sheet.showModal();
      }
      renderPreview(c);
      if (!preview.open) preview.showModal();
      return;
    }

    closeQuietly(preview);
    if (c) {
      if (!sheet.open || sheet.dataset.challenge !== c.id) renderSheet(c);
      if (!sheet.open) sheet.showModal();
      return;
    }

    // Plain board.
    closeQuietly(sheet);
    delete sheet.dataset.challenge;
    if (draft) discardDraft();
    if (app.justFound) celebrateFind(app.justFound);
  }

  function celebrateFind(id) {
    app.justFound = null;
    const li = refreshCard(id);
    renderHead();
    renderNext();
    renderFoot();
    const btn = li.querySelector(".card");
    btn.classList.add("is-new");
    root.querySelector(".board__head").classList.add("is-updated");
    hydratePhotos(li);
    btn.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
    btn.focus({ preventScroll: true });
    setTimeout(() => root.querySelector(".board__head")?.classList.remove("is-updated"), 900);
  }

  // Actions -----------------------------------------------------------------

  async function finish() {
    const n = foundCount(getActive());
    const total = hunt.challenges.length;
    if (n < total) {
      const ok = await confirmDialog({
        title: n === 0 ? "Finish without any discoveries?" : `Finish with ${n} of ${total} discoveries?`,
        body: n === 0 ? "That's fine — there's always another walk." : "",
        confirm: "Finish hunt",
        cancel: "Keep looking",
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
    haptic([20, 80, 20, 80, 30]);
    app.celebrate = true;
    go("recap", { replace: true });
  }

  function onClick(e) {
    const opener = e.target.closest("[data-open]");
    if (opener && !sheet.open) return go(`hunt/${opener.dataset.open}`);
    const action = e.target.closest("[data-action]")?.dataset.action;
    const current = sheet.dataset.challenge;
    switch (action) {
      case "home":
        return returnTo("");
      case "finish":
        return finish();
      case "close":
        if (!busy) sheet.close();
        return;
      case "camera":
      case "library":
        return capture(current, action);
      case "retake":
        return capture(draft.challengeId, draft.source, { fromPreview: true });
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
      if (draft?.url) URL.revokeObjectURL(draft.url);
    },
  };
}

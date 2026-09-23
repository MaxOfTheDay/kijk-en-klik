import { HUNTS, getHunt } from "../content/hunts.js";
import { icon } from "../content/icons.js";
import { getActive, foundCount, startHunt } from "../lib/state.js";
import { deletePhotos } from "../lib/photos.js";
import { go, returnTo } from "../lib/nav.js";
import { esc, confirmDialog, toast } from "../lib/ui.js";

export function mount(root) {
  root.innerHTML = `
    <main class="screen hunts">
      <header class="topbar">
        <button class="icon-btn" data-action="back" aria-label="Back">${icon("back")}</button>
      </header>
      <h1 class="page-title">Choose a hunt</h1>
      <p class="page-lede">Every hunt is a board of things to find. Do them in any order.</p>
      <ul class="hunt-list">
        ${HUNTS.map(
          (h) => `
          <li>
            <button class="hunt-card" data-hunt="${esc(h.id)}" style="--accent:${h.accent}">
              <span class="hunt-card__mark">${icon(h.theme, { size: 30 })}</span>
              <span class="hunt-card__body">
                <span class="hunt-card__title">${esc(h.title)}</span>
                <span class="hunt-card__desc">${esc(h.description)}</span>
                <span class="hunt-card__meta">${h.challenges.length} things to find</span>
              </span>
              ${icon("arrow", { className: "hunt-card__arrow" })}
            </button>
          </li>`,
        ).join("")}
      </ul>
    </main>`;

  async function onClick(e) {
    if (e.target.closest("[data-action=back]")) return returnTo("");
    const card = e.target.closest("[data-hunt]");
    if (!card) return;
    const hunt = getHunt(card.dataset.hunt);
    const active = getActive();
    const activeHunt = active && getHunt(active.huntId);
    if (activeHunt && foundCount(active) > 0) {
      const ok = await confirmDialog({
        title: `Start ${hunt.title}?`,
        body: `Your ${activeHunt.title} will be wrapped up with ${foundCount(active)} of ${activeHunt.challenges.length} found, and kept as your last walk.`,
        confirm: `Start ${hunt.title}`,
        cancel: "Keep current hunt",
      });
      if (!ok) return;
    }
    let orphans;
    try {
      orphans = startHunt(hunt);
    } catch {
      toast("Couldn't start the hunt — your browser's storage seems full or blocked.");
      return;
    }
    deletePhotos(orphans).catch(() => {});
    go("hunt", { replace: true });
  }

  root.addEventListener("click", onClick);
  return { destroy: () => root.removeEventListener("click", onClick) };
}

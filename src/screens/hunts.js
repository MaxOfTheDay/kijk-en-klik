import { HUNTS, getHunt } from "../content/hunts.js";
import { icon } from "../content/icons.js";
import { getActive, foundCount, startHunt } from "../lib/state.js";
import { deletePhotos } from "../lib/photos.js";
import { go, returnTo } from "../lib/nav.js";
import { esc, confirmDialog, toast } from "../lib/ui.js";
import { replacedWalkNote } from "./shared.js";

// Every hunt has the same number of challenges, so it's said once above the
// list rather than on each card.
function boardSize() {
  const sizes = new Set(HUNTS.map((h) => h.challenges.length));
  return sizes.size === 1 ? [...sizes][0] : "een handvol";
}

export function mount(root) {
  root.innerHTML = `
    <main class="screen hunts">
      <header class="topbar">
        <button class="icon-btn" data-action="back" aria-label="Terug">${icon("back")}</button>
      </header>
      <h1 class="page-title">Kies een speurtocht</h1>
      <p class="page-lede">Elke tocht heeft ${boardSize()} dingen om te vinden, in welke volgorde je maar wilt.</p>
      <ul class="hunt-list">
        ${HUNTS.map(
          (h) => `
          <li>
            <button class="hunt-card" data-hunt="${esc(h.id)}" style="--accent:${h.accent}">
              <span class="hunt-card__mark">${icon(h.theme, { size: 30 })}</span>
              <span class="hunt-card__body">
                <span class="hunt-card__title">${esc(h.title)}</span>
                <span class="hunt-card__desc">${esc(h.description)}</span>
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
        title: `Beginnen met ${hunt.title}?`,
        body: [
          `Je ${activeHunt.title} wordt afgerond met ${foundCount(active)} van ${activeHunt.challenges.length} gevonden, en bewaard als je vorige tocht.`,
          replacedWalkNote(),
        ].join(" ").trim(),
        confirm: "Nieuwe tocht beginnen",
        cancel: "Huidige tocht houden",
      });
      if (!ok) return;
    }
    let orphans;
    try {
      orphans = startHunt(hunt);
    } catch {
      toast("De tocht kon niet starten. De opslag van je browser is vol of geblokkeerd.");
      return;
    }
    deletePhotos(orphans).catch(() => {});
    go("hunt", { replace: true });
  }

  root.addEventListener("click", onClick);
  return { destroy: () => root.removeEventListener("click", onClick) };
}

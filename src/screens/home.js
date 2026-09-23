import { getActive, getLast, foundCount } from "../lib/state.js";
import { getHunt } from "../content/hunts.js";
import { icon, trail } from "../content/icons.js";
import { go } from "../lib/nav.js";
import { esc, privacyNote } from "../lib/ui.js";
import { formatDate } from "../lib/recap.js";
import { hydratePhotos } from "./shared.js";

export function mount(root) {
  const active = getActive();
  const activeHunt = active && getHunt(active.huntId);
  const last = getLast();
  const lastHunt = last && getHunt(last.huntId);

  root.innerHTML = `
    <main class="screen home">
      <header class="home__head">
        <p class="wordmark">${icon("camera", { size: 20 })}<span>Kijk <i>&amp;</i> Klik</span></p>
        <h1 class="home__title">Ga op pad.<br>Kijk goed.<br><em>Klik!</em></h1>
        <p class="home__lede">Kies een speurtocht, ga naar buiten en vind 8 dingen. Maak van elke vondst een foto.</p>
        ${trail({ className: "home__trail", end: "cross" })}
      </header>

      ${activeHunt ? resumeCard(active, activeHunt) : `
        <button class="btn btn--primary btn--big" data-go="hunts">
          Start een speurtocht ${icon("arrow")}
        </button>`}

      ${lastHunt ? lastWalkCard(last, lastHunt) : ""}

      <footer class="home__foot">${privacyNote()}</footer>
    </main>`;

  root.addEventListener("click", onClick);
  hydratePhotos(root);

  return { destroy: () => root.removeEventListener("click", onClick) };
}

function onClick(e) {
  const target = e.target.closest("[data-go]");
  if (target) go(target.dataset.go);
}

function resumeCard(run, hunt) {
  const n = foundCount(run);
  const total = hunt.challenges.length;
  // Filled by count, like the board's route: photos first, then open slots.
  const photos = hunt.challenges.map((c) => run.finds[c.id]).filter(Boolean);
  const slots = [
    ...photos.map((f) => `<span class="strip__slot is-found"><img alt="" data-photo-id="${esc(f.photoId)}"></span>`),
    ...Array.from({ length: total - photos.length }, () => `<span class="strip__slot"></span>`),
  ].join("");
  return `
    <section class="resume" style="--accent:${hunt.accent}" aria-labelledby="resume-title">
      <p class="eyebrow">${icon("compass", { size: 16 })} Onderweg</p>
      <h2 id="resume-title" class="resume__title">${esc(hunt.title)}</h2>
      <p class="resume__count">${n === 0 ? `${total} dingen om te vinden` : `<b>${n}</b> van ${total} gevonden`}</p>
      <div class="strip" aria-hidden="true">${slots}</div>
      <button class="btn btn--primary btn--big" data-go="hunt">Ga verder ${icon("arrow")}</button>
    </section>
    <button class="btn btn--quiet" data-go="hunts">Andere speurtocht kiezen</button>`;
}

function lastWalkCard(run, hunt) {
  const n = foundCount(run);
  const photos = hunt.challenges
    .map((c) => run.finds[c.id]?.photoId)
    .filter(Boolean)
    .slice(0, 3)
    .map((id) => `<img alt="" data-photo-id="${esc(id)}">`)
    .join("");
  return `
    <button class="lastwalk" data-go="recap">
      <span class="lastwalk__photos" aria-hidden="true">${photos || icon(hunt.theme, { size: 28 })}</span>
      <span class="lastwalk__text">
        <span class="eyebrow eyebrow--muted">Vorige tocht</span>
        <span class="lastwalk__title">${esc(hunt.title)}</span>
        <span class="lastwalk__meta">${n} van ${hunt.challenges.length} · ${formatDate(run.startedAt)}</span>
      </span>
      ${icon("arrow", { className: "lastwalk__arrow" })}
    </button>`;
}

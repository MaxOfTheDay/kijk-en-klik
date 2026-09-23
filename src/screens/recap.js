import { getLast } from "../lib/state.js";
import { getHunt } from "../content/hunts.js";
import { icon } from "../content/icons.js";
import { buildRecap } from "../lib/recap.js";
import { go, returnTo } from "../lib/nav.js";
import { esc, reducedMotion } from "../lib/ui.js";
import { hydratePhotos } from "./shared.js";

// Gentle, fixed tilts so the board feels hand-pinned without looking random.
const TILTS = [-1.1, 0.8, -0.5, 1.2, -0.9, 0.4, -1.3, 0.7, -0.3, 1];

export function mount(root, route, app) {
  const run = getLast();
  const recap = buildRecap(run, getHunt(run.huntId));
  const celebrate = app.celebrate && !reducedMotion();
  app.celebrate = false;
  const complete = recap.found === recap.total;
  const left = recap.missing.length;

  root.innerHTML = `
    <main class="screen recap ${celebrate ? "is-arriving" : ""}" style="--accent:${recap.accent}">
      <header class="topbar">
        <button class="icon-btn" data-action="home" aria-label="Sluiten en naar start">${icon("close")}</button>
      </header>

      <section class="recap__head">
        <div class="stamp-wrap">
          <p class="stamp ${complete ? "stamp--full" : ""}">${
            complete ? `${icon("star", { size: 18 })} Alles gevonden!` : `${icon("compass", { size: 18 })} Tocht afgerond`
          }</p>
          ${celebrate ? burst() : ""}
        </div>
        <h1 class="recap__title">${esc(recap.title)}</h1>
        <p class="recap__meta">${recap.found} van ${recap.total} gevonden · ${esc(recap.dateLabel)}</p>
        ${recap.found ? `<p class="recap__cheer">${complete ? "Wat een tocht!" : "Mooie vondsten!"}</p>` : ""}
      </section>

      ${recap.items.length ? collage(recap.items) : `
        <section class="recap__empty">
          <p class="recap__empty-title">Deze keer geen foto's.</p>
          <p>De wandeling telt nog steeds.</p>
        </section>`}

      ${left && recap.items.length ? `<p class="recap__rest">Nog ${left} om te vinden, voor een volgende keer</p>` : ""}

      <footer class="recap__foot">
        ${recap.items.length ? `<p class="recap__tip">Houd een foto ingedrukt om hem op je telefoon te bewaren.</p>` : ""}
        <button class="btn btn--secondary" data-go="hunts">Nog een speurtocht</button>
        <button class="btn btn--quiet" data-action="home">Terug naar start</button>
      </footer>
    </main>`;

  hydratePhotos(root);

  function onClick(e) {
    if (e.target.closest("[data-action=home]")) return returnTo("");
    const target = e.target.closest("[data-go]");
    if (target) go(target.dataset.go);
  }
  root.addEventListener("click", onClick);
  return { destroy: () => root.removeEventListener("click", onClick) };
}

// Rows of [wide, half, half]. A half left alone at the end becomes wide.
function collage(items) {
  const n = items.length;
  const prints = items.map((item, i) => {
    const wide = i % 3 === 0 || (i === n - 1 && i % 3 === 1);
    return `
      <li class="print ${wide ? "print--wide" : ""}" style="--tilt:${TILTS[i % TILTS.length]}deg; --i:${i}">
        <figure>
          <div class="print__photo" data-photo-frame>
            <img alt="${esc(item.label)}" data-photo-id="${esc(item.photoId)}" data-photo-size="full">
          </div>
          <figcaption>${esc(item.label)}</figcaption>
        </figure>
      </li>`;
  });
  return `<ol class="collage" aria-label="Jullie vondsten">${prints.join("")}</ol>`;
}

// A small, one-off burst of stars around the stamp. Only right after finishing.
function burst() {
  const stars = [
    [-70, -26, 14], [-44, -44, 10], [54, -40, 12], [78, -8, 9], [-80, 14, 9], [66, 24, 13],
  ];
  return `<span class="burst" aria-hidden="true">${stars
    .map(([x, y, s], i) => `<span style="--x:${x}px;--y:${y}px;--d:${i * 40}ms">${icon("star", { size: s })}</span>`)
    .join("")}</span>`;
}

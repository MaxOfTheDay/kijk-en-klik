import { getLast } from "../lib/state.js";
import { getHunt } from "../content/hunts.js";
import { icon } from "../content/icons.js";
import { buildRecap } from "../lib/recap.js";
import { go, returnTo } from "../lib/nav.js";
import { esc, privacyNote, reducedMotion } from "../lib/ui.js";
import { hydratePhotos } from "./shared.js";

// Gentle, fixed tilts so the board feels hand-pinned without looking random.
const TILTS = [-1.1, 0.8, -0.5, 1.2, -0.9, 0.4, -1.3, 0.7, -0.3, 1];

export function mount(root, route, app) {
  const run = getLast();
  const recap = buildRecap(run, getHunt(run.huntId));
  const celebrate = app.celebrate && !reducedMotion();
  app.celebrate = false;

  root.innerHTML = `
    <main class="screen recap ${celebrate ? "is-arriving" : ""}" style="--accent:${recap.accent}">
      <header class="topbar">
        <button class="icon-btn" data-action="home" aria-label="Close and go home">${icon("close")}</button>
      </header>

      <section class="recap__head">
        <p class="stamp">${icon("check", { size: 16 })} Hunt complete</p>
        <h1 class="recap__title">${esc(recap.title)}</h1>
        <p class="recap__meta">${recap.found} of ${recap.total} discoveries · ${esc(recap.dateLabel)}</p>
      </section>

      ${recap.items.length ? collage(recap.items) : `
        <section class="recap__empty">
          <p class="recap__empty-title">No photos this time.</p>
          <p>The walk still counts.</p>
        </section>`}

      ${recap.missing.length && recap.items.length ? `
        <section class="recap__rest">
          <h2 class="section-label">Still out there, for next time</h2>
          <ul>${recap.missing.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
        </section>` : ""}

      <footer class="recap__foot">
        ${recap.items.length ? `<p class="recap__tip">Press and hold a photo to save it to your phone.</p>` : ""}
        <button class="btn btn--primary btn--big" data-go="hunts">Start another hunt ${icon("arrow")}</button>
        <button class="btn btn--quiet" data-action="home">Back home</button>
        ${privacyNote()}
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
  return `<ol class="collage" aria-label="Your discoveries">${prints.join("")}</ol>`;
}

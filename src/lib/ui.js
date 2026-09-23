// Small shared UI helpers: escaping, toasts, confirm dialogs, haptics.

import { icon } from "../content/icons.js";
import { AI_CHECK_ENABLED } from "./ai-check.js";

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function haptic(pattern = 12) {
  if (reducedMotion()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported: silently skip.
  }
}

let toastTimer = null;
export function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 3200);
}

// A light confirm using <dialog>. Resolves true when confirmed.
export function confirmDialog({ title, body = "", confirm, cancel = "Niet nu" }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "confirm";
    dialog.setAttribute("aria-labelledby", "confirm-title");
    dialog.innerHTML = `
      <form method="dialog" class="confirm__inner">
        <h2 id="confirm-title" class="confirm__title">${esc(title)}</h2>
        ${body ? `<p class="confirm__body">${esc(body)}</p>` : ""}
        <div class="confirm__actions">
          <button class="btn btn--primary" value="yes">${esc(confirm)}</button>
          <button class="btn btn--quiet" value="no">${esc(cancel)}</button>
        </div>
      </form>`;
    document.body.append(dialog);
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue === "yes");
      dialog.remove();
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close("no");
    });
    dialog.showModal();
  });
}

export function privacyNote() {
  const text = AI_CHECK_ENABLED
    ? "Je foto's blijven op dit toestel. Om mee te kijken gaat er even een verkleinde kopie naar een AI-dienst. Wij bewaren je foto's nergens anders."
    : "Je foto's blijven op dit toestel. Er wordt niets geüpload.";
  return `<p class="privacy">${icon("lock", { size: 16 })}<span>${text}</span></p>`;
}

// Photo check: asks an external service whether a photo fits the challenge.
// It is a soft hint on the preview, never a gate — the player can always keep
// their photo. Everything about the service lives in this file; the rest of
// the app only sees "YES" | "UNSURE" | "NO", or null when there is no answer
// (switched off, offline, slow, failed or an odd reply).
//
// Only a reduced copy (image.js → checkCopy) is sent, together with the
// challenge text. Nothing is stored by the app anywhere but on this device.

import { checkCopy } from "./image.js";

export const AI_CHECK_ENABLED = true;
export const AI_CHECK_ENDPOINT = "https://kijk-en-klik-ai.maxheyrman.workers.dev/check";
const TIMEOUT_MS = 9000;

const RESULTS = new Set(["YES", "UNSURE", "NO"]);

// Whether a check is worth starting at all (so the preview doesn't flash
// "Even kijken…" when it is switched off or there is no connection).
export function photoCheckAvailable() {
  return AI_CHECK_ENABLED && navigator.onLine !== false;
}

// Resolves to "YES" | "UNSURE" | "NO", or null. Never rejects.
// `signal` lets the caller give up early (e.g. the photo was already kept).
export async function checkChallengePhoto({ challenge, image, signal }) {
  if (!photoCheckAvailable() || !challenge || !image) return null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, TIMEOUT_MS);
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const body = new FormData();
    body.append("challenge", challenge);
    body.append("image", await checkCopy(image), "photo.jpg");
    if (controller.signal.aborted) return null;
    const res = await fetch(AI_CHECK_ENDPOINT, { method: "POST", body, signal: controller.signal });
    if (!res.ok) return null;
    const result = String((await res.json())?.result ?? "").trim().toUpperCase();
    return RESULTS.has(result) ? result : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

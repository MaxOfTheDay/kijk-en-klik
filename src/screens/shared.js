import { walkAtRisk, foundCount } from "../lib/state.js";
import { getHunt } from "../content/hunts.js";
import { photoUrl, cachedPhotoUrl } from "../lib/photos.js";

// Fills every <img data-photo-id> under `root` from local storage.
// `data-photo-size` picks "thumb" (default) or "full".
export function hydratePhotos(root) {
  const imgs = root.querySelectorAll("img[data-photo-id]:not([src])");
  return Promise.all(
    [...imgs].map(async (img) => {
      const { photoId, photoSize = "thumb" } = img.dataset;
      img.decoding = "async";
      const onLoad = () => img.classList.add("is-loaded");
      img.addEventListener("load", onLoad, { once: true });
      const cached = cachedPhotoUrl(photoId, photoSize);
      if (cached) {
        img.src = cached;
        if (img.complete) onLoad();
        return;
      }
      try {
        const url = await photoUrl(photoId, photoSize);
        if (url) img.src = url;
        else img.closest("[data-photo-frame]")?.classList.add("is-missing");
      } catch {
        img.closest("[data-photo-frame]")?.classList.add("is-missing");
      }
    }),
  );
}

// One plain sentence for confirm dialogs when wrapping up the active hunt
// would replace a saved walk with photos. Empty when nothing would be lost.
export function replacedWalkNote() {
  const run = walkAtRisk();
  const hunt = run && getHunt(run.huntId);
  if (!hunt) return "";
  const n = foundCount(run);
  return `Je vorige tocht, ${hunt.title}, verdwijnt dan van dit toestel, met ${n === 1 ? "de foto" : `alle ${n} foto's`}.`;
}

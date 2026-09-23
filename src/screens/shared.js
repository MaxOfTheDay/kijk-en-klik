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

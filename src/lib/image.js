// Turns a camera/gallery file into two right-sized JPEGs:
//   full  — long edge 1600px, for the preview and the recap
//   thumb — long edge 640px, for board cards
// A modern phone photo (4–12 MB) ends up around 250–450 KB in total, so a
// 12-photo hunt stays in the single-digit megabytes.
//
// Orientation: browsers apply EXIF rotation when decoding (createImageBitmap
// with imageOrientation "from-image", and <img> by default), and the canvas
// re-encode drops EXIF, so stored photos are always upright pixels.

const FULL_EDGE = 1600;
const THUMB_EDGE = 640;

export class UnreadableImageError extends Error {}

export async function processImage(file) {
  const source = await decode(file);
  try {
    const { width, height } = source;
    if (!width || !height) throw new UnreadableImageError("Empty image");
    const full = await encode(source, FULL_EDGE, 0.84);
    const thumb = await encode(source, THUMB_EDGE, 0.78);
    return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
  } finally {
    source.close?.();
  }
}

async function decode(file) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to <img>, which handles a few more formats on some browsers.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight, image: img };
  } catch {
    throw new UnreadableImageError("Could not decode image");
  } finally {
    // Safe: the decoded pixels stay available to drawImage.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

async function encode(source, maxEdge, quality) {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source.image ?? source, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  canvas.width = canvas.height = 0; // release memory early on iOS
  if (!blob) throw new UnreadableImageError("Could not encode image");
  return { blob, width, height };
}

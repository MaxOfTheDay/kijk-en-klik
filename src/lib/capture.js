// Getting a photo from the device. We use the platform's own file input:
// with `capture` it opens the phone's camera app, without it the photo
// library. That's the most reliable route on Android and iOS, needs no
// live-camera permission flow, and falls back to a file picker on desktop.

export function pickPhoto(source) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") input.setAttribute("capture", "environment");
    input.hidden = true;
    const done = (file) => {
      input.remove();
      resolve(file);
    };
    input.addEventListener("change", () => done(input.files?.[0] ?? null), { once: true });
    input.addEventListener("cancel", () => done(null), { once: true });
    document.body.append(input);
    input.click();
  });
}

// The camera shortcut only exists on phones and tablets; desktop browsers
// ignore `capture` and show a file picker, so there we lead with "choose".
export function canTakePhoto() {
  return navigator.maxTouchPoints > 0 || window.matchMedia("(any-pointer: coarse)").matches;
}

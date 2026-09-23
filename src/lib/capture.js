// The fallback route to a photo: the platform's own file input. Without the
// `capture` attribute phones offer both "take a photo" and "choose from
// library", which is exactly what "Foto maken of kiezen" promises.

export function pickPhoto() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
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

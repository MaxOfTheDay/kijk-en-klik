// Tiny hash router. Routes are plain paths after "#/":
//   ""                   home
//   "hunts"              choose a hunt
//   "hunt"               the active hunt board
//   "hunt/<id>"          a challenge, opened over the board
//   "hunt/<id>/photo"    preview of a just-taken photo
//   "recap"              the last finished hunt
//
// Each history entry remembers the trail of in-app paths that led to it, so
// "return to X" can step back through real history (keeping the Android back
// button honest) instead of stacking duplicate entries.

let listener = () => {};

export function currentPath() {
  return decodeURIComponent(location.hash.replace(/^#\/?/, ""));
}

export function parseRoute(path = currentPath()) {
  const [head, id, sub] = path.split("/");
  switch (head) {
    case "hunts":
      return { name: "hunts" };
    case "hunt":
      return { name: "board", challengeId: id || null, preview: Boolean(id && sub === "photo") };
    case "recap":
      return { name: "recap" };
    default:
      return { name: "home" };
  }
}

export function onRouteChange(fn) {
  listener = fn;
  window.addEventListener("popstate", () => listener(parseRoute()));
}

export function go(path, { replace = false } = {}) {
  const trail = history.state?.trail ?? [];
  const url = `#/${path}`;
  if (replace) {
    history.replaceState({ trail }, "", url);
  } else {
    history.pushState({ trail: [...trail, currentPath()].slice(-20) }, "", url);
  }
  listener(parseRoute());
}

// Go back to `path` if it is behind us in history, otherwise replace.
export function returnTo(path) {
  const trail = history.state?.trail ?? [];
  const index = trail.lastIndexOf(path);
  if (index >= 0) {
    history.go(index - trail.length);
  } else {
    go(path, { replace: true });
  }
}

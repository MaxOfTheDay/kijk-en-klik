// Hunt progress: small JSON in localStorage. Photos themselves live in
// IndexedDB (photos.js); a "find" only stores the photo's id.
//
// {
//   version: 1,
//   active: Run | null,   the hunt being played
//   last:   Run | null,   the most recently finished hunt (shown as a recap)
// }
//
// Run = {
//   huntId, mode, startedAt, finishedAt,
//   finds: { [challengeId]: { photoId, foundAt } }
// }

const KEY = "kijk-en-klik:v1";

export class StateWriteError extends Error {}

let cache = null;

function read() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    if (parsed?.version === 1) cache = parsed;
  } catch {
    // Corrupt or unavailable storage: start fresh rather than crash.
  }
  cache ??= { version: 1, active: null, last: null };
  return cache;
}

function write(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    throw new StateWriteError(err?.message ?? "Could not save progress");
  }
  cache = next;
}

export function getActive() {
  return read().active;
}

export function getLast() {
  return read().last;
}

export function foundCount(run) {
  return run ? Object.keys(run.finds).length : 0;
}

export function photoIdsOf(run) {
  return run ? Object.values(run.finds).map((f) => f.photoId) : [];
}

export function referencedPhotoIds() {
  const s = read();
  return new Set([...photoIdsOf(s.active), ...photoIdsOf(s.last)]);
}

// Starts a new hunt. An unfinished hunt with photos is wrapped up as the
// last walk rather than thrown away. Returns photo ids that are no longer
// referenced and can be deleted.
export function startHunt(hunt) {
  const s = read();
  let last = s.last;
  if (s.active && foundCount(s.active) > 0) {
    last = { ...s.active, finishedAt: Date.now() };
  }
  const active = { huntId: hunt.id, mode: hunt.mode, startedAt: Date.now(), finishedAt: null, finds: {} };
  write({ ...s, active, last });
  return orphansAfter(s);
}

// Records a photo for a challenge. Returns the id of a replaced photo, if any.
export function recordFind(challengeId, photoId) {
  const s = read();
  if (!s.active) throw new StateWriteError("No active hunt");
  const previous = s.active.finds[challengeId]?.photoId ?? null;
  const finds = { ...s.active.finds, [challengeId]: { photoId, foundAt: Date.now() } };
  write({ ...s, active: { ...s.active, finds } });
  return previous;
}

// The saved walk that wrapping up the active hunt would replace, if that walk
// has photos. Only a hunt with finds of its own ever replaces the last walk.
export function walkAtRisk() {
  const s = read();
  if (foundCount(s.active) === 0 || foundCount(s.last) === 0) return null;
  return s.last;
}

// Finishes the active hunt; it becomes the last walk. A hunt without finds
// just ends, so it never pushes out a saved walk. Returns orphaned ids.
export function finishActive() {
  const s = read();
  if (!s.active) return [];
  const last = foundCount(s.active) > 0 ? { ...s.active, finishedAt: Date.now() } : s.last;
  write({ ...s, active: null, last });
  return orphansAfter(s);
}

function orphansAfter(before) {
  const keep = referencedPhotoIds();
  return [...photoIdsOf(before.active), ...photoIdsOf(before.last)].filter((id) => !keep.has(id));
}

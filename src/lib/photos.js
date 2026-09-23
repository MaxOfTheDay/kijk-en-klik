// Photo storage: image blobs live in IndexedDB, never in localStorage.
// Hunt progress (src/lib/state.js) only holds photo ids that point here.
//
//   photos  { id, full: Blob, thumb: Blob, width, height, createdAt }
//   drafts  { id: "current", huntId, challengeId, source, full, thumb, width, height }
//           A photo that was taken but not yet accepted — kept so a refresh
//           on the preview screen doesn't lose it.

const DB_NAME = "kijk-en-klik";
const DB_VERSION = 1;

let dbPromise = null;
const urlCache = new Map(); // `${id}:${size}` -> object URL

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "id" });
        if (!db.objectStoreNames.contains("drafts")) db.createObjectStore("drafts", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

async function run(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    const req = fn(store);
    if (req) req.onsuccess = () => (result = req.result);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

export function newPhotoId() {
  const rand = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `p-${rand}`;
}

export async function savePhoto(record) {
  await run("photos", "readwrite", (s) => s.put({ ...record, createdAt: Date.now() }));
  requestPersistence();
}

export function getPhoto(id) {
  return run("photos", "readonly", (s) => s.get(id));
}

export async function deletePhotos(ids) {
  const list = ids.filter(Boolean);
  if (!list.length) return;
  await run("photos", "readwrite", (s) => {
    list.forEach((id) => s.delete(id));
  });
  list.forEach(forgetUrls);
}

export function listPhotoIds() {
  return run("photos", "readonly", (s) => s.getAllKeys());
}

// Returns an object URL for a stored photo, cached for the page lifetime.
export async function photoUrl(id, size = "thumb") {
  const key = `${id}:${size}`;
  if (urlCache.has(key)) return urlCache.get(key);
  const rec = await getPhoto(id);
  if (!rec) return null;
  const url = URL.createObjectURL(rec[size] ?? rec.full);
  urlCache.set(key, url);
  return url;
}

// Synchronous lookup, so re-rendered cards can show a photo without a flash.
export function cachedPhotoUrl(id, size = "thumb") {
  return urlCache.get(`${id}:${size}`) ?? null;
}

function forgetUrls(id) {
  for (const size of ["thumb", "full"]) {
    const key = `${id}:${size}`;
    if (urlCache.has(key)) {
      URL.revokeObjectURL(urlCache.get(key));
      urlCache.delete(key);
    }
  }
}

// Drafts --------------------------------------------------------------------

export function saveDraft(draft) {
  return run("drafts", "readwrite", (s) => s.put({ ...draft, id: "current" }));
}

export function getDraft() {
  return run("drafts", "readonly", (s) => s.get("current"));
}

export function clearDraft() {
  return run("drafts", "readwrite", (s) => s.delete("current"));
}

// Ask the browser not to evict our data under storage pressure. Best effort.
let persistAsked = false;
function requestPersistence() {
  if (persistAsked) return;
  persistAsked = true;
  navigator.storage?.persist?.().catch(() => {});
}

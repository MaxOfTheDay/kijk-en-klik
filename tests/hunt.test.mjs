// End-to-end check of the core loop in a phone-sized Chromium:
// choose → capture out of order (live camera + photo library) → reload →
// finish early → recap → offline. Chromium's fake camera stands in for a
// real one; a second browser without camera permission checks the fallback.
// Run with `npm test` (needs Playwright's Chromium).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, devices } from "playwright";
import { serve } from "../scripts/serve.mjs";

const PORT = 8765;
const BASE = `http://localhost:${PORT}/`;
let server, browser, deniedBrowser, photo;

before(async () => {
  server = await serve(PORT);
  browser = await chromium.launch({
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  deniedBrowser = await chromium.launch({
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream=deny"],
  });
  // A stand-in camera photo: a large JPEG like a phone would produce.
  const dir = mkdtempSync(join(tmpdir(), "kek-"));
  photo = join(dir, "walk.jpg");
  const maker = await browser.newPage({ viewport: { width: 2400, height: 1800 } });
  await maker.setContent(`<body style="margin:0;height:100vh;background:linear-gradient(135deg,#6f8f4e,#e0c67a)">`);
  await maker.screenshot({ path: photo, type: "jpeg", quality: 92 });
  await maker.close();
});

after(async () => {
  await browser?.close();
  await deniedBrowser?.close();
  server?.close();
});

function openChallenge(page, title) {
  return page.locator(".grid .card", { hasText: title }).click().then(() => page.locator("dialog.sheet[open]").waitFor());
}

async function accept(page, title) {
  await page.locator("dialog.preview[open] img").waitFor();
  await page.locator("dialog.preview[open]").getByRole("button", { name: "Deze houden" }).click();
  await page.locator(".grid .card.is-found", { hasText: title }).waitFor();
  await page.locator("dialog[open]").first().waitFor({ state: "detached" }).catch(() => {});
}

// Live, in-app camera: Foto maken → viewfinder → shutter → preview.
async function captureLive(page, title) {
  await openChallenge(page, title);
  await page.locator("dialog.sheet[open] [data-action=camera]").click();
  await page.locator("dialog.camera[open] .shutter:not([disabled])").waitFor();
  await page.locator("dialog.camera[open] .shutter").click();
  await accept(page, title);
}

// From the photo library via the native picker.
async function captureFromLibrary(page, title) {
  await openChallenge(page, title);
  const chooser = page.waitForEvent("filechooser");
  await page.locator("dialog.sheet[open] [data-action=library]").click();
  await (await chooser).setFiles(photo);
  await accept(page, title);
}

test("a hunt can be played out of order, resumed, finished early and replayed offline", async () => {
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE);
  await page.getByRole("button", { name: /Start een speurtocht/ }).click();
  await page.getByRole("button", { name: /Magische speurtocht/ }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "8 dingen om te vinden" }).waitFor());
  assert.equal(await page.locator(".grid .card").count(), 8);

  // Any order: the sixth challenge first, then the second.
  await captureLive(page, "geheime doorgang");
  await captureFromLibrary(page, "feeëndeurtje");
  assert.match(await page.locator(".board__count").innerText(), /2\s+van 8 gevonden/);

  // Closing the camera stops the stream.
  await openChallenge(page, "toverboom");
  await page.locator("dialog.sheet[open] [data-action=camera]").click();
  await page.locator("dialog.camera[open] .shutter:not([disabled])").waitFor();
  await page.getByRole("button", { name: "Camera sluiten" }).click();
  await page.waitForFunction(() => !document.querySelector("dialog.camera").open);
  assert.equal(await page.evaluate(() => document.querySelector("dialog.camera video")?.srcObject === null), true);
  assert.equal(new URL(page.url()).hash, "#/hunt/magic-tree");
  await page.getByRole("button", { name: "Sluiten", exact: true }).click();

  // Stored photos are resized, not full resolution.
  // (The fake camera is only 640×480, so check the long edge never exceeds
  // 1600px and that the large library photo was scaled down to exactly that.)
  const stored = await page.evaluate(async () => {
    const { listPhotoIds, getPhoto } = await import("/src/lib/photos.js");
    const recs = await Promise.all((await listPhotoIds()).map(getPhoto));
    return recs.map((r) => ({ edge: Math.max(r.width, r.height), bytes: r.full.size + r.thumb.size }));
  });
  assert.equal(stored.length, 2);
  assert.ok(stored.every((r) => r.edge <= 1600 && r.bytes < 600_000), JSON.stringify(stored));
  assert.ok(stored.some((r) => r.edge === 1600), JSON.stringify(stored));

  // Survives a reload with photos intact.
  await page.reload();
  await page.locator(".grid .card.is-found img.is-loaded").first().waitFor();
  assert.equal(await page.locator(".grid .card.is-found").count(), 2);

  // Replace a photo by reopening a completed challenge.
  await captureLive(page, "feeëndeurtje");
  assert.equal(await page.locator(".grid .card.is-found").count(), 2);

  // Finish early.
  await page.getByRole("button", { name: "Klaar met zoeken" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Klaar voor vandaag?" }).waitFor());
  assert.equal(await page.locator("dialog.confirm .confirm__body").innerText(), "Jullie 2 foto's gaan in het overzicht.");
  await page.locator("dialog.confirm button[value=yes]").click();
  await page.getByRole("heading", { name: "Magische speurtocht" }).waitFor();
  assert.match(await page.locator(".recap__meta").innerText(), /^2 van 8 gevonden · /);
  assert.equal(await page.locator(".collage .print").count(), 2);
  await page.locator(".collage img.is-loaded").nth(1).waitFor();
  assert.equal(await page.locator(".stamp").innerText(), "TOCHT AFGEROND");
  assert.equal(await page.locator(".recap__rest").innerText(), "Nog 6 om te vinden, voor een volgende keer");

  // The replaced photo was cleaned up.
  const left = await page.evaluate(async () => (await (await import("/src/lib/photos.js")).listPhotoIds()).length);
  assert.equal(left, 2);

  // Offline: once loaded, the app shell and recap still work.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.locator(".collage img.is-loaded").first().waitFor();
  await page.getByRole("button", { name: "Terug naar start" }).click();
  await page.getByRole("button", { name: /Start een speurtocht/ }).waitFor();
  await context.setOffline(false);

  assert.deepEqual(errors, []);
  await context.close();
});

test("without camera permission, the camera screen offers the native picker instead", async () => {
  const context = await deniedBrowser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE);
  await page.getByRole("button", { name: /Start een speurtocht/ }).click();
  await page.getByRole("button", { name: /Natuurspeurtocht/ }).click();
  await openChallenge(page, "vreemdste boom");
  await page.locator("dialog.sheet[open] [data-action=camera]").click();
  const fallback = page.locator("dialog.camera[open] .camera__fallback:not([hidden])");
  await fallback.waitFor();
  const chooser = page.waitForEvent("filechooser");
  await fallback.getByRole("button", { name: /Foto maken of kiezen/ }).click();
  await (await chooser).setFiles(photo);
  await accept(page, "vreemdste boom");
  assert.match(await page.locator(".board__count").innerText(), /1\s+van 8 gevonden/);

  // Next time, the sheet goes straight to the picker.
  await openChallenge(page, "drie verschillende bladeren");
  await assert.doesNotReject(page.locator("dialog.sheet[open]").getByRole("button", { name: /Foto maken of kiezen/ }).waitFor());

  // In a fresh page: the sheet underneath switches to the picker as soon as
  // the camera turns out to be refused.
  const fresh = await context.newPage();
  fresh.on("pageerror", (e) => errors.push(String(e)));
  await fresh.goto(BASE + "#/hunt");
  await openChallenge(fresh, "kleins dat groeit");
  await fresh.locator("dialog.sheet[open] [data-action=camera]").click();
  await fresh.locator("dialog.camera[open] .camera__fallback:not([hidden])").waitFor();
  await fresh.getByRole("button", { name: "Camera sluiten" }).click();
  await assert.doesNotReject(fresh.locator("dialog.sheet[open]").getByRole("button", { name: /Foto maken of kiezen/ }).waitFor());
  assert.deepEqual(errors, []);
  await context.close();
});

test("every challenge opens on the rear camera; a selfie switch stays with its challenge", async () => {
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  // Record what the app asks getUserMedia for.
  await context.addInitScript(() => {
    window.__facing = [];
    const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (c) => {
      window.__facing.push(JSON.stringify(c.video.facingMode));
      return real(c);
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const lastRequest = () => page.evaluate(() => window.__facing.at(-1));
  // Everything asked for since the last call. The fake camera has no facing
  // mode, so the exact rear request fails and the app falls back to a preference.
  const requests = () => page.evaluate(() => window.__facing.splice(0));
  const rearFirst = [JSON.stringify({ exact: "environment" }), JSON.stringify({ ideal: "environment" })];
  const video = page.locator("dialog.camera[open] video");

  await page.goto(BASE);
  await page.getByRole("button", { name: /Start een speurtocht/ }).click();
  await page.getByRole("button", { name: /Gekke vondsten/ }).click();

  await openChallenge(page, "gezicht");
  await page.locator("dialog.sheet[open] [data-action=camera]").click();
  await page.locator("dialog.camera[open] .shutter:not([disabled])").waitFor();
  assert.deepEqual(await requests(), rearFirst);

  // Switch to the selfie camera (the fake device has one camera, so the
  // button stays hidden; click it directly).
  await page.evaluate(() => document.querySelector("dialog.camera [data-cam=switch]").click());
  await page.locator("dialog.camera[open] video.is-mirrored").waitFor();
  await page.locator("dialog.camera[open] .shutter:not([disabled])").waitFor();
  assert.equal(await lastRequest(), JSON.stringify({ ideal: "user" }));

  // A retake of the same photo keeps the selfie camera.
  await page.locator("dialog.camera[open] .shutter").click();
  await page.locator("dialog.preview[open] img").waitFor();
  await page.getByRole("button", { name: "Opnieuw" }).click();
  await page.locator("dialog.camera[open] .shutter:not([disabled])").waitFor();
  assert.equal(await video.evaluate((v) => v.classList.contains("is-mirrored")), true);
  await page.locator("dialog.camera[open] .shutter").click();
  await accept(page, "gezicht");

  // The next challenge starts from the rear camera again.
  await openChallenge(page, "wolk");
  await requests();
  await page.locator("dialog.sheet[open] [data-action=camera]").click();
  await page.locator("dialog.camera[open] .shutter:not([disabled])").waitFor();
  assert.deepEqual(await requests(), rearFirst);
  assert.equal(await video.evaluate((v) => v.classList.contains("is-mirrored")), false);

  assert.deepEqual(errors, []);
  await context.close();
});

test("a saved walk is never replaced by an empty hunt, and never replaced silently", async () => {
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const photoCount = () => page.evaluate(async () => (await (await import("/src/lib/photos.js")).listPhotoIds()).length);

  // A finished walk with two photos: play one and finish it.
  await page.goto(BASE);
  await page.getByRole("button", { name: /Start een speurtocht/ }).click();
  await page.getByRole("button", { name: /Kleuren & vormen/ }).click();
  await captureFromLibrary(page, "ronds");
  await captureFromLibrary(page, "driehoek");
  await page.getByRole("button", { name: "Klaar met zoeken" }).click();
  // Nothing saved yet, so no warning.
  assert.equal(await page.locator("dialog.confirm .confirm__body").innerText(), "Jullie 2 foto's gaan in het overzicht.");
  await page.locator("dialog.confirm button[value=yes]").click();
  await page.locator(".collage .print").first().waitFor();
  assert.equal(await photoCount(), 2);

  // Start a new hunt and finish it without finds: the saved walk survives.
  await page.getByRole("button", { name: /Nog een speurtocht/ }).click();
  await page.getByRole("button", { name: /Natuurspeurtocht/ }).click();
  await page.getByRole("button", { name: "Klaar met zoeken" }).click();
  assert.equal(await page.locator("dialog.confirm").getByText("verdwijnt").count(), 0);
  await page.locator("dialog.confirm button[value=yes]").click();
  await page.locator(".lastwalk", { hasText: "Kleuren & vormen" }).waitFor();
  assert.match(await page.locator(".lastwalk__meta").innerText(), /^2 van 8/);
  assert.equal(await photoCount(), 2);

  // With a find of its own, switching hunts says the saved walk will go.
  await page.getByRole("button", { name: /Start een speurtocht/ }).click();
  await page.getByRole("button", { name: /Natuurspeurtocht/ }).click();
  await captureFromLibrary(page, "vreemdste boom");
  await page.getByRole("button", { name: "Terug naar start" }).click();
  await page.getByRole("button", { name: "Andere speurtocht kiezen" }).click();
  await page.getByRole("button", { name: /Gekke vondsten/ }).click();
  await assert.doesNotReject(
    page.locator("dialog.confirm").getByText("Je vorige tocht, Kleuren & vormen, verdwijnt dan van dit toestel, met alle 2 foto's.").waitFor(),
  );
  await page.locator("dialog.confirm button[value=no]").click();

  // Finishing says so too, and only then replaces it.
  await page.getByRole("button", { name: "Terug" }).click();
  await page.getByRole("button", { name: /Ga verder/ }).click();
  await page.getByRole("button", { name: "Klaar met zoeken" }).click();
  await assert.doesNotReject(page.locator("dialog.confirm").getByText(/Kleuren & vormen, verdwijnt dan/).waitFor());
  await page.locator("dialog.confirm button[value=yes]").click();
  await page.getByRole("heading", { name: "Natuurspeurtocht" }).waitFor();
  await page.waitForFunction(async () => (await (await import("/src/lib/photos.js")).listPhotoIds()).length === 1);

  assert.deepEqual(errors, []);
  await context.close();
});

test("a new release reaches an open app, without interrupting a capture", async () => {
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const caches = () => page.evaluate(() => caches.keys());
  // What a phone does when the app comes back to the foreground.
  const checkForUpdate = () => page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));

  await page.goto(BASE);
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  const first = await caches();
  assert.equal(first.length, 1);

  // Nothing open: the app reloads into the new version straight away.
  await page.evaluate(() => (window.__before = true));
  server.release();
  const reloaded = page.waitForEvent("load");
  await checkForUpdate();
  await reloaded;
  assert.equal(await page.evaluate(() => window.__before), undefined);
  const second = await caches();
  assert.equal(second.length, 1);
  assert.notDeepEqual(second, first);

  // A layer is open (mid-capture): wait until the app goes to the background.
  await page.getByRole("button", { name: /Start een speurtocht/ }).click();
  await page.getByRole("button", { name: /Gekke vondsten/ }).click();
  await openChallenge(page, "wolk");
  await page.evaluate(() => (window.__before = true));
  server.release();
  await checkForUpdate();
  await page.waitForFunction((old) => caches.keys().then((k) => k.length === 1 && k[0] !== old), second[0]);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__before), true);
  const hidden = page.waitForEvent("load");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await hidden;
  // Back where they were: the sheet for the same challenge.
  await page.locator("dialog.sheet[open]", { hasText: "wolk" }).waitFor();

  assert.deepEqual(errors, []);
  await context.close();
});

test("the manifest is installable", async () => {
  const res = await fetch(`${BASE}manifest.webmanifest`);
  const manifest = await res.json();
  assert.equal(manifest.display, "standalone");
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes("192x192") && sizes.includes("512x512"));
  assert.ok(manifest.icons.some((i) => i.purpose === "maskable"));
  for (const icon of manifest.icons) assert.equal((await fetch(BASE + icon.src)).status, 200, icon.src);
});

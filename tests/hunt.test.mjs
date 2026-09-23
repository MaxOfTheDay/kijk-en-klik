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
  await page.getByRole("button", { name: "Gebruiken" }).click();
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
  await page.getByRole("button", { name: "Speurtocht afronden" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Afronden met 2 van 8 vondsten?" }).waitFor());
  await page.locator("dialog.confirm button[value=yes]").click();
  await page.getByRole("heading", { name: "Magische speurtocht" }).waitFor();
  assert.match(await page.locator(".recap__meta").innerText(), /^2 van 8 gevonden · /);
  assert.equal(await page.locator(".collage .print").count(), 2);
  await page.locator(".collage img.is-loaded").nth(1).waitFor();

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

test("the manifest is installable", async () => {
  const res = await fetch(`${BASE}manifest.webmanifest`);
  const manifest = await res.json();
  assert.equal(manifest.display, "standalone");
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes("192x192") && sizes.includes("512x512"));
  assert.ok(manifest.icons.some((i) => i.purpose === "maskable"));
  for (const icon of manifest.icons) assert.equal((await fetch(BASE + icon.src)).status, 200, icon.src);
});

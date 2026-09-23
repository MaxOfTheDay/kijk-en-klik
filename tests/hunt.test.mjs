// End-to-end check of the core loop in a phone-sized Chromium:
// choose → capture out of order → reload → finish early → recap → offline.
// Run with `npm test` (needs Playwright's Chromium).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, devices } from "playwright";
import { serve } from "../scripts/serve.mjs";

const PORT = 8765;
const URL = `http://localhost:${PORT}/`;
let server, browser, photo;

before(async () => {
  server = await serve(PORT);
  browser = await chromium.launch();
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
  server?.close();
});

async function capture(page, title) {
  await page.locator(".grid .card", { hasText: title }).click();
  await page.locator("dialog.sheet[open]").waitFor();
  const chooser = page.waitForEvent("filechooser");
  await page.locator("dialog.sheet[open] [data-action=camera]").click();
  await (await chooser).setFiles(photo);
  await page.locator("dialog.preview[open] img").waitFor();
  await page.getByRole("button", { name: "Use photo" }).click();
  await page.locator("dialog.preview[open]").waitFor({ state: "detached" }).catch(() => {});
  await page.locator(".grid .card.is-found", { hasText: title }).waitFor();
}

test("a hunt can be played out of order, resumed, finished early and replayed offline", async () => {
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(URL);
  await page.getByRole("button", { name: /Start a hunt/ }).click();
  await page.getByRole("button", { name: /Magic Hunt/ }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "8 things to find" }).waitFor());
  assert.equal(await page.locator(".grid .card").count(), 8);

  // Any order: the sixth challenge first, then the second.
  await capture(page, "secret portal");
  await capture(page, "fairy door");
  assert.match(await page.locator(".board__count").innerText(), /2\s+of 8 found/);

  // Stored photos are resized, not full resolution.
  const stored = await page.evaluate(async () => {
    const { listPhotoIds, getPhoto } = await import("/src/lib/photos.js");
    const ids = await listPhotoIds();
    const rec = await getPhoto(ids[0]);
    return { count: ids.length, width: rec.width, height: rec.height, bytes: rec.full.size + rec.thumb.size };
  });
  assert.equal(stored.count, 2);
  assert.equal(Math.max(stored.width, stored.height), 1600);
  assert.ok(stored.bytes < 600_000, `photo too large: ${stored.bytes}`);

  // Survives a reload with photos intact.
  await page.reload();
  await page.locator(".grid .card.is-found img.is-loaded").first().waitFor();
  assert.equal(await page.locator(".grid .card.is-found").count(), 2);

  // Replace a photo by reopening a completed challenge.
  await capture(page, "fairy door");
  assert.equal(await page.locator(".grid .card.is-found").count(), 2);

  // Finish early.
  await page.getByRole("button", { name: "Finish hunt" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Finish with 2 of 8 discoveries?" }).waitFor());
  await page.locator("dialog.confirm button[value=yes]").click();
  await page.getByRole("heading", { name: "Magic Hunt" }).waitFor();
  assert.match(await page.locator(".recap__meta").innerText(), /^2 of 8 discoveries · /);
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
  await page.getByRole("button", { name: "Back home" }).click();
  await page.getByRole("button", { name: /Start a hunt/ }).waitFor();
  await context.setOffline(false);

  assert.deepEqual(errors, []);
  await context.close();
});

test("the manifest is installable", async () => {
  const res = await fetch(`${URL}manifest.webmanifest`);
  const manifest = await res.json();
  assert.equal(manifest.display, "standalone");
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes("192x192") && sizes.includes("512x512"));
  assert.ok(manifest.icons.some((i) => i.purpose === "maskable"));
  for (const icon of manifest.icons) assert.equal((await fetch(URL + icon.src)).status, 200, icon.src);
});

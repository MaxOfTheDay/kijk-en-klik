// Renders the PNG app icons from scripts/icon-art.mjs using Playwright.
// Dev-only: `node scripts/make-icons.mjs`
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { iconSvg } from "./icon-art.mjs";

const out = new URL("../icons/", import.meta.url);
writeFileSync(new URL("icon.svg", out), iconSvg());

const targets = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
  ["apple-touch-icon.png", 180, true], // iOS rounds the corners itself
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, maskable] of targets) {
  await page.setViewportSize({ width: size, height: size });
  const svg = iconSvg({ maskable }).replace("<svg ", `<svg width="${size}" height="${size}" `);
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
  await page.screenshot({ path: new URL(name, out).pathname, omitBackground: true });
}
await browser.close();
console.log("icons written");

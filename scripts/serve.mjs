// Minimal static server for local development: `npm start`.
// Any static host works in production (HTTPS is required for the PWA).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT) || 8080;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};

// Each server start is a new "release" for the service worker; tests can
// publish another one with server.release().
let release = Date.now();

export function serve(p = port) {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
    const file = join(root, path === "" ? "index.html" : path);
    if (!file.startsWith(root) || file.includes("node_modules")) {
      res.writeHead(403).end();
      return;
    }
    try {
      let body = await readFile(file);
      if (path === "sw.js") body = String(body).replace('const VERSION = "dev";', `const VERSION = "dev-${release}";`);
      res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-cache" });
      res.end(body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
  server.release = () => (release += 1);
  return new Promise((resolve) => server.listen(p, () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await serve();
  console.log(`Kijk & Klik on http://localhost:${port}`);
}

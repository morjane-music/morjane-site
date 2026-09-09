import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 8765);
const blockedPaths = new Set(["/data/knowledge-graph.json"]);
const aliases = new Map([
  ["/epk", "/epk.html"],
  ["/set", "/set.html"],
  ["/set-access", "/set-access.html"],
  ["/acte1-access", "/acte1-access.html"],
  ["/acte1", "/acte1.html"],
  ["/fissure", "/acte1.html"],
  ["/confidentialite", "/confidentialite.html"],
  ["/cookies", "/cookies.html"],
  ["/mentions-legales", "/mentions-legales.html"],
  ["/mentions-legales/", "/mentions-legales.html"]
]);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf"
};

http.createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", "http://localhost");
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (blockedPaths.has(pathname)) {
    response.statusCode = 404;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    fs.createReadStream(path.join(root, "404.html")).pipe(response);
    return;
  }
  pathname = aliases.get(pathname) || pathname;
  if (pathname === "/") pathname = "/index.html";
  let filePath = path.join(root, pathname.replace(/^\/+/, ""));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(root, "404.html");
    response.statusCode = 404;
  }
  response.setHeader("Content-Type", mime[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  fs.createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Static preview: http://127.0.0.1:${port}`);
});

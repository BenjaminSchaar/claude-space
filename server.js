const http = require("http");
const fs = require("fs");
const path = require("path");

// Tiny static server for local preview. GitHub Pages serves these files directly.
const ROOT = __dirname;
const PORT = process.env.PORT || 8765;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

http
  .createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split("?")[0]);
    if (rel === "/") rel = "/index.html";
    const full = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
    if (!full.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("forbidden");
    }
    fs.readFile(full, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end("not found");
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(full)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log("claude_space → http://localhost:" + PORT));

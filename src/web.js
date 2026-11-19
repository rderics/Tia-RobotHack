// Tia as a website: serves the same screen as the desktop app and runs the same brain.
// Listens on this computer only (127.0.0.1) – it uses the Claude login of the person at this computer.
// Start: npm run web   →   open http://localhost:4747
const http = require("http");
const fs = require("fs");
const path = require("path");
const engine = require("./brain/engine");

const PORT = Number(process.env.TIA_PORT || 4747);
const HOST = "127.0.0.1";
const STATIC_DIR = path.join(__dirname, "renderer");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };

const clients = new Set(); // open event streams (one per browser tab)
let running = false;

function broadcast(ev) {
  const line = `data: ${JSON.stringify(ev)}\n\n`;
  for (const res of clients) res.write(line);
}

function sendJson(res, code, body) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body ?? null));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e6) req.destroy(); // nothing legitimate is this big
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function handleApi(req, res, route) {
  if (req.method === "GET" && route === "/api/info") return sendJson(res, 200, engine.info());

  if (req.method === "GET" && route === "/api/events") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
    res.write(": connected\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  if (req.method !== "POST") return sendJson(res, 405, { error: "method not allowed" });
  const body = await readBody(req);

  if (route === "/api/run") {
    if (running) return sendJson(res, 409, { error: "Tia is already working on the inbox" });
    running = true;
    try {
      await engine.runDay({ mode: body.mode === "replay" ? "replay" : "live", onEvent: broadcast });
    } catch (e) {
      broadcast({ type: "error", error: String(e.message || e) });
    } finally {
      running = false;
    }
    return sendJson(res, 200, { ok: true });
  }
  if (route === "/api/feedback") return sendJson(res, 200, engine.recordFeedback(body));
  if (route === "/api/reset") {
    engine.resetDemo();
    return sendJson(res, 200, { ok: true });
  }
  return sendJson(res, 404, { error: "not found" });
}

function serveStatic(res, route) {
  const rel = route === "/" ? "index.html" : decodeURIComponent(route.slice(1));
  const file = path.normalize(path.join(STATIC_DIR, rel));
  if (!file.startsWith(STATIC_DIR + path.sep)) return sendJson(res, 403, { error: "forbidden" });
  fs.readFile(file, (err, buf) => {
    if (err) return sendJson(res, 404, { error: "not found" });
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  // Only pages from this server may call the API (blocks other websites from driving Tia).
  const origin = req.headers.origin;
  if (origin && origin !== `http://localhost:${PORT}` && origin !== `http://${HOST}:${PORT}`) return sendJson(res, 403, { error: "forbidden origin" });
  const route = new URL(req.url, `http://${HOST}`).pathname;
  try {
    if (route.startsWith("/api/")) return await handleApi(req, res, route);
    return serveStatic(res, route);
  } catch (e) {
    return sendJson(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Tia website running: http://localhost:${PORT}  (this computer only, Ctrl+C to stop)`);
});

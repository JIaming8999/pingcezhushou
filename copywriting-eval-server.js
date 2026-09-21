const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const htmlPath = path.join(root, "copywriting-eval-workbench.html");
const mimoBase = "https://token-plan-cn.xiaomimimo.com/v1";
const port = Number(process.env.PORT || 8787);

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/copywriting-eval-workbench.html")) {
      const html = fs.readFileSync(htmlPath);
      send(res, 200, { "Content-Type": "text/html; charset=utf-8" }, html);
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      send(res, 200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: true }));
      return;
    }

    if (url.pathname.startsWith("/proxy/mimo/v1/")) {
      const targetPath = url.pathname.replace("/proxy/mimo/v1", "");
      const target = mimoBase + targetPath + url.search;
      const body = await readBody(req);
      const upstream = await fetch(target, {
        method: req.method,
        headers: {
          "Content-Type": req.headers["content-type"] || "application/json",
          "Authorization": req.headers.authorization || ""
        },
        body: ["GET", "HEAD"].includes(req.method) ? undefined : body
      });
      const text = await upstream.text();
      send(res, upstream.status, {
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }, text);
      return;
    }

    if (req.method === "OPTIONS") {
      send(res, 204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
      }, "");
      return;
    }

    send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
  } catch (err) {
    send(res, 500, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ error: String(err && err.message || err) }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Copywriting eval workbench: http://127.0.0.1:${port}`);
});

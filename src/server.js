import http from "http";
const PORT = process.env.PORT || 8787;
const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (req.method === "GET" && url === "/healthz") {
    const body = JSON.stringify({ status: "ok", service: "stateid", ts: new Date().toISOString() });
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    return res.end(body);
  }
  if (req.method === "GET" && url === "/") { res.writeHead(302, { Location: "/healthz" }); return res.end(); }
  res.writeHead(404, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "not found" }));
});
server.listen(PORT, () => console.log(`health server: http://localhost:${PORT}/healthz`));

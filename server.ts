import { createServer } from "http";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import NextServer from "next/dist/server/next-server.js";
import { initIO } from "./src/lib/socket.js";

const port = parseInt(process.env.PORT || "3000", 10);
const dir = dirname(fileURLToPath(import.meta.url));

const conf = JSON.parse(
  readFileSync(join(dir, ".next/required-server-files.json"), "utf-8")
).config;

const nextServer = new NextServer({ conf, dir });
const handler = nextServer.getRequestHandler();

const httpServer = createServer((req, res) => {
  handler(req, res);
});

initIO(httpServer);

httpServer.listen(port, () => {
  console.log(`> Ready on http://localhost:${port} (Next.js + Socket.IO)`);
});

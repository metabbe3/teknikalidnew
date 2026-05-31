import { createServer } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { initIO } from "./src/lib/socket.js";

const port = parseInt(process.env.PORT || "3000", 10);
const dir = process.cwd();

// Load standalone config — mirrors what the generated standalone server.js does
const { config: nextConfig } = JSON.parse(
  readFileSync(join(dir, ".next/required-server-files.json"), "utf-8")
);
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);

// router-server provides the full pipeline: static files, compression, rewrites, etc.
// This is the critical difference from the old code which imported NextServer directly
// (render-server only, no static file serving).
const { initialize } = require("next/dist/server/lib/router-server.js");

async function start() {
  const { requestHandler } = await initialize({
    dir,
    port,
    hostname: process.env.HOSTNAME || "0.0.0.0",
    dev: false,
    minimalMode: true,
    quiet: false,
  });

  const httpServer = createServer((req, res) => {
    requestHandler(req, res);
  });

  initIO(httpServer);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (Next.js + Socket.IO)`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeRedis } from "./cache.js";
import { pool } from "./db/pool.js";
import { setupDatabase } from "./db/setup.js";

await setupDatabase();
const server = createApp().listen(config.port, () => {
  console.log(`StayFinder API listening on http://localhost:${config.port}`);
});

async function shutdown() {
  server.close(async () => {
    await closeRedis();
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

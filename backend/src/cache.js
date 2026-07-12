import { createClient } from "redis";
import { config } from "./config.js";

const client = createClient({ url: config.redisUrl });
let connecting;

client.on("error", (error) => {
  if (process.env.NODE_ENV !== "test") console.warn("Redis error:", error.message);
});

export async function getRedis() {
  if (client.isOpen) return client;
  connecting ??= client.connect().finally(() => {
    connecting = undefined;
  });
  await connecting;
  return client;
}

export async function closeRedis() {
  if (client.isOpen) await client.quit();
}

export async function invalidatePropertySearches() {
  const redis = await getRedis();
  await redis.incr("properties:version");
}

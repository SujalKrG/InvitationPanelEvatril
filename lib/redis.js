import IOredis from "ioredis";

let _client = null;

export function createRedisClient() {
  if (_client) return _client;

  const url = process.env.REDIS_URL || null;
  _client = url
    ? new IOredis(url, { maxRetriesPerRequest: null })
    : new IOredis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: null,
      });

  // helpful listeners for development / logs
  _client.on("error", (err) =>
    console.error("[redis] error", err?.message || err)
  );
  _client.on("connect", () => console.info("[redis] connect"));
  _client.on("ready", () => console.info("[redis] ready"));
  _client.on("end", () => console.info("[redis] connection closed"));

  return _client;
}

/**
 * redisHealthy(timeoutMs)
 * Quick ping check returning true if redis responds with PONG within timeout.
 */
export async function redisHealthy(timeoutMs = 2000) {
  try {
    const c = createRedisClient();
    const p = await Promise.race([
      c.ping(),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), timeoutMs)
      ),
    ]);
    return p === "PONG";
  } catch (err) {
    return false;
  }
}

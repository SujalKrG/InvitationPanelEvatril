import { Queue } from "bullmq";
import { createRedisClient } from "./redis.js";

const redisClient = createRedisClient();

/**
 * getQueue(name)
 * Returns a BullMQ Queue instance that uses the shared Redis client.
 * Use this in controllers to add jobs.
 */

export function getQueue(name) {
  return new Queue(name, { connection: redisClient });
}

// export the shared connection object for Worker usage
export const redisConnection = redisClient;

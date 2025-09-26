// worker.mjs
import dotenv from "dotenv";
dotenv.config();

import { startPhotoWorker } from "../queues/photo.queue.js";

const concurrency = Number(process.env.PHOTO_WORKER_CONCURRENCY || 2);
console.log(`Starting photo worker (concurrency=${concurrency})`);

const worker = startPhotoWorker({ concurrency });

// graceful shutdown
const shutdown = async () => {
  console.log("Shutting down photo worker...");
  try {
    // Worker returned by startPhotoWorker is the worker instance
    if (worker && typeof worker.close === "function") await worker.close();
    process.exit(0);
  } catch (err) {
    console.error("Error during worker shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

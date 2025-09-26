import { startUserThemeWorker } from "../queues/userTheme.queue.js";
import dotenv from "dotenv";
dotenv.config();

const concurrency = Number(process.env.USERTHEME_WORKER_CONCURRENCY || 2);
console.log(`Starting usertheme worker (concurrency=${concurrency})`);

let worker = null;
(async () => {
  try {
    worker = await startUserThemeWorker({ concurrency });
  } catch (err) {
    console.error("Failed to start usertheme worker:", err);
    process.exit(1);
  }
})();

//! Graceful Shutdown
const shutdown = async () => {
  console.log("Shutting down usertheme worker...");
  try {
    if (worker && typeof worker.close === "function") await worker.close();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

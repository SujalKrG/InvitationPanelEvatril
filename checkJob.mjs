// checkJob.mjs
import { photoQueue } from "./queues/photo.queue.js";

(async () => {
  const jobId = "0c3b4ebd52372d6aea7813127ad492c2ac03fcf1"; // put your job id here
  const job = await photoQueue.getJob(jobId);
  console.log("job exists:", !!job);
  if (job) {
    console.log("job id:", job.id);
    console.log("state:", await job.getState());
    console.log("attemptsMade:", job.attemptsMade);
    console.log("timestamp:", new Date(job.timestamp).toISOString());
  }
  console.log("counts:");
  console.log(" waiting:", await photoQueue.getWaitingCount());
  console.log(" active:", await photoQueue.getActiveCount());
  console.log(" completed:", await photoQueue.getCompletedCount());
  console.log(" failed:", await photoQueue.getFailedCount());
  console.log(" delayed:", await photoQueue.getDelayedCount());
  process.exit(0);
})();

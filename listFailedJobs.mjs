// listFailedJobs.mjs
import { photoQueue } from "./queues/photo.queue.js";

(async () => {
  try {
    console.log("Fetching failed jobs (most recent 50)...");
    // get failed jobs (start=0 end=49)
    const jobs = await photoQueue.getJobs(["failed"], 0, 49, false);
    console.log("failed count:", jobs.length);
    for (const j of jobs) {
      console.log("----");
      console.log("id:", j.id);
      console.log("name:", j.name);
      console.log("state:", await j.getState());
      console.log("attemptsMade:", j.attemptsMade);
      console.log("failedReason:", j.failedReason);
      console.log("data:", j.data);
      console.log("timestamp:", new Date(j.timestamp).toISOString());
    }
  } catch (err) {
    console.error("error listing failed jobs:", err?.message || err);
  } finally {
    process.exit(0);
  }
})();

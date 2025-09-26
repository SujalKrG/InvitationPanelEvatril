import { Worker } from "bullmq";
import { uploadToS3, deleteFromS3 } from "../utils/s3.js";
import {
  uploadUserThemeToS3,
  deleteLocalFile,
} from "../utils/userThemeS3Folder.js";
import { getQueue, redisConnection } from "../lib/queues.js";
import * as userThemeRepo from "../repositories/userTheme.repository.js";

/**
 * Start the worker for processing user theme uploads
 * @param {object} options
 * @param {number} options.concurrency - how many jobs to process at once
 */

export function startUserThemeWorker({ concurrency = 2 } = {}) {
  const worker = new Worker(
    "usertheme-queue",
    async (job) => {
      const {
        userThemeId,
        processingPath,
        originalName,
        mimeType,
        prevProcessedKey,
      } = job.data || {};
      console.log(
        `[usertheme-worker] Start job=${job.id} for userThemeId=${userThemeId}`
      );

      if (!userThemeId) throw new Error("Missing userThemeId in job data");
      if (!processingPath)
        throw new Error("Missing processingPath in job data");

      // Step 1: Fetch DB row
      const row = await userThemeRepo.findById(userThemeId);
      if (!row) throw new Error("UserTheme row not found");

      let uploadResult;
      try {
        uploadResult = await uploadUserThemeToS3({
          processingPath,
          originalName,
          mimeType,
          strict: false, // set true if you want strict mime-folder checks
        });
      } catch (err) {
        await userThemeRepo
          .mergeUploadMeta(userThemeId, {
            status: "failed",
            error: `upload_helper_failed: ${err.message}`,
          })
          .catch(() => {});
        throw new Error(`Upload helper failed: ${err.message}`);
      }

      // uploadResult: { Key, url, folder, detectedMime, mimeMatch }
      console.log("[usertheme-worker] uploadResult:", uploadResult);

      const s3Url = uploadResult.url ?? null;
      const s3Key = uploadResult.Key ?? uploadResult.key ?? null;
      const folder = uploadResult.folder ?? null;

      if (!s3Url) {
        await userThemeRepo
          .mergeUploadMeta(userThemeId, {
            status: "failed",
            error: "s3_resp_missing_url_from_helper",
          })
          .catch(() => {});
        throw new Error(
          `Upload helper did not return url: ${JSON.stringify(uploadResult)}`
        );
      }

      // Step 5: Update DB with file_url and upload_meta
      try {
        await userThemeRepo.updateFileUrlAndMeta(userThemeId, s3Url, {
          processed_key: s3Key,
          status: "ready",
          s3_folder: folder,
        });
      } catch (err) {
        await userThemeRepo
          .mergeUploadMeta(userThemeId, {
            status: "failed",
            error: `db_update_failed: ${err.message}`,
          })
          .catch(() => {});
        throw new Error(`Failed to update DB: ${err.message}`);
      }

      // Step 6: Delete previous S3 object AFTER DB points to new file
      if (prevProcessedKey) {
        try {
          await deleteFromS3(prevProcessedKey);
          console.log(
            `[usertheme-worker] Deleted previous S3 key: ${prevProcessedKey}`
          );
        } catch (err) {
          console.warn(
            `[usertheme-worker] Failed to delete previous S3 key ${prevProcessedKey}:`,
            err.message
          );
          // do not fail the job — DB already updated
        }
      }

      // Step 7: Cleanup local file
      await deleteLocalFile(processingPath).catch(() => {});

      console.log(`[usertheme-worker] Completed job=${job.id}, URL=${s3Url}`);
      return { url: s3Url };
    },
    { connection: redisConnection, concurrency }
  );

  // Error handling
  worker.on("failed", (job, err) => {
    const reason = err?.message ?? String(err);
    console.error(
      `[usertheme-worker] Job failed id=${job?.id}, reason=${reason}`
    );
    if (job?.data?.userThemeId) {
      userThemeRepo
        .mergeUploadMeta(job.data.userThemeId, {
          status: "failed",
          error: reason,
        })
        .catch(() => {});
    }
  });

  worker.on("error", (err) =>
    console.error("[usertheme-worker] worker error:", err)
  );

  worker.on("completed", (job) => {
    console.log(`[usertheme-worker] Job completed id=${job.id}`);
  });

  console.log(`[usertheme-worker] Started with concurrency=${concurrency}`);
  return worker;
}

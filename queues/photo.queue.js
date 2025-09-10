import { Worker } from "bullmq";
import fs from "fs/promises";
import sharp from "sharp";
import db from "../models/index.js";
import { uploadToS3, deleteFromS3 } from "../utils/s3.js";

import { getQueue, redisConnection } from "../lib/queues.js";

const { sequelize } = db;

export const photoQueue = getQueue("photo-queue");
export const photoDLQ = getQueue("photo-dlq");

export const startPhotoWorker = ({ concurrency = 2 } = {}) => {
  console.info("[photo-worker] DB CHECK env:", {
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER || process.env.DB_USERNAME,
  });

  const worker = new Worker(
    "photo-queue",
    async (job) => {
      const { eventId, field, processingPath, originalName } = job.data;
      if (!eventId || !field || !processingPath)
        throw new Error("Missing required job data");

      const jsonBase = `$.${field}`; //controller already validated field

      console.info(
        `[photo-worker] start job=${job.id} event=${eventId} field=${field} path=${processingPath}`
      );

      //? Idempotent check - skip if processed_key already present
      try {
        const [rows] = await sequelize.query(
          `SELECT
       JSON_UNQUOTE(JSON_EXTRACT(COALESCE(occasion_data, JSON_OBJECT()), '$.${field}.processed_key')) AS processed_key,
       JSON_UNQUOTE(JSON_EXTRACT(COALESCE(occasion_data, JSON_OBJECT()), '$.${field}.job_id')) AS job_id
     FROM events WHERE id = :id LIMIT 1`,
          { replacements: { id: eventId } }
        );

        const row = rows && rows[0] ? rows[0] : {};
        const processedKey =
          row.processed_key === null ? null : row.processed_key;
        const dbJobId = row.job_id === null ? null : row.job_id;

        console.info(`[photo-worker] idempotency check`, {
          eventId,
          field,
          processedKey,
          dbJobId,
          currentJobId: String(job.id),
        });

        const isProcessed =
          typeof processedKey === "string" &&
          processedKey.trim() !== "" &&
          processedKey.trim().toLowerCase() !== "null";

        if (isProcessed && (!dbJobId || String(dbJobId) !== String(job.id))) {
          console.info(
            `[photo-worker] job=${job.id} skipping - processed by other job (processed_key present and job_id mismatch)`
          );

          try {
            await sequelize.query(
              `UPDATE events
           SET occasion_data = JSON_SET(
             COALESCE(occasion_data, JSON_OBJECT()),
             '${jsonBase}.status', 'ready',
             '${jsonBase}.job_id', :jid
           ), updated_at = NOW()
         WHERE id = :id
           AND ( JSON_UNQUOTE(JSON_EXTRACT(COALESCE(occasion_data, JSON_OBJECT()), '${jsonBase}.status')) IS NULL
                 OR JSON_UNQUOTE(JSON_EXTRACT(COALESCE(occasion_data, JSON_OBJECT()), '${jsonBase}.status')) <> 'ready' )`,
              { replacements: { id: eventId, jid: job.id } }
            );
          } catch (err) {
            console.warn(
              `[photo-worker] reconcile skip update failed job=${job.id}:`,
              err?.message || err
            );
          }

          await fs.unlink(processingPath).catch(() => {});
          return { skipped: true };
        }
      } catch (error) {
        console.warn(
          `[photo-worker] idempotency check failed job=${job.id}:`,
          error?.message || error
        );
        // continue - still safe to process
      }

      //? Mark processing
      try {
        await sequelize.query(
          `UPDATE events SET occasion_data = JSON_SET(
             COALESCE(occasion_data, JSON_OBJECT()),
             '${jsonBase}.status', 'processing',
             '${jsonBase}.job_id', :jid
           ), updated_at = NOW() WHERE id = :id`,
          { replacements: { id: eventId, jid: job.id } }
        );
      } catch (error) {
        console.warn(
          `[photo-worker] warn: could not set processing for job=${job.id}:`,
          error?.message || error
        );
      }

      //? Read temp file
      let buffer;
      try {
        buffer = await fs.readFile(processingPath);
      } catch (error) {
        console.error(
          `[photo-worker] read error job=${job.id} path=${processingPath}:`,
          error?.message || error
        );
        throw error; // let BullMQ retry
      }

      //? process image with sharp
      let mainBuf;
      try {
        mainBuf = await sharp(buffer).jpeg({ quality: 75 }).toBuffer();
      } catch (error) {
        console.error(
          `[photo-worker] sharp error job=${job.id}:`,
          error?.message || error
        );
        throw error;
      }

      //? Upload to S3
      let mainUrl;
      try {
        mainUrl = await uploadToS3(
          mainBuf,
          originalName || `photo-${Date.now()}.jpg`,
          "image/jpeg",
          "events"
        );
      } catch (error) {
        console.error(
          `[photo-worker] S3 upload error job=${job.id}:`,
          error?.message || error
        );
        throw error;
      }

      // Normalize S3 upload result
      let s3Key, finalUrl;

      if (typeof mainUrl === "string") {
        // case: uploadToS3 returned a URL string
        finalUrl = mainUrl;
        s3Key = mainUrl;
      } else if (mainUrl && typeof mainUrl === "object") {
        // case: uploadToS3 returned an object (common AWS SDK v3 pattern)
        s3Key = mainUrl.Key || mainUrl.key || mainUrl.Location || "";
        finalUrl = mainUrl.url || mainUrl.Location || "";
      } else {
        throw new Error("uploadToS3 returned invalid response");
      }

      console.log("Worker DB Update Attempt", {
        jsonBase,
        eventId,
        s3Key,
        finalUrl,
      });

      //? persist final url and processed_key in DB (with oldKey capture + delete after update)
      //? persist final url and processed_key in DB (and then delete previous_key if present)
      try {
        // --- Update DB to new key/url/status (with retry loop) ---
        let attempts = 0;
        const maxAttempts = 5;
        while (true) {
          try {
            await sequelize.query(
              `UPDATE events SET occasion_data = JSON_SET(
           COALESCE(occasion_data, JSON_OBJECT()),
           '${jsonBase}.processed_key', :pkey,
           '${jsonBase}.url', :url,
           '${jsonBase}.status', 'ready'
         ), updated_at = NOW() WHERE id = :id`,
              {
                replacements: {
                  id: eventId,
                  pkey: String(s3Key),
                  url: String(finalUrl),
                },
              }
            );
            break; // exit loop if successful
          } catch (error) {
            attempts += 1;
            console.warn(
              `[photo-worker] DB update attempt ${attempts} failed job=${job.id}:`,
              error?.message || error
            );
            if (attempts >= maxAttempts) throw error;
            await new Promise((r) => setTimeout(r, 500 * attempts));
          }
        }

        // cleanup local processing file (once)
        try {
          await fs.unlink(processingPath).catch(() => {});
        } catch (err) {
          console.warn(
            `[photo-worker] cleanup warning job=${job.id}:`,
            err?.message || err
          );
        }

        // --- Now attempt to delete the previous_key (if the controller saved one) ---
        try {
          const [rowsPrev] = await sequelize.query(
            `SELECT JSON_UNQUOTE(JSON_EXTRACT(COALESCE(occasion_data, JSON_OBJECT()), '$.${field}.previous_key')) AS previous_key
       FROM events WHERE id = :id LIMIT 1`,
            { replacements: { id: eventId } }
          );
          const prevRow = rowsPrev && rowsPrev[0] ? rowsPrev[0] : null;
          let previousKey = prevRow ? prevRow.previous_key : null;

          // normalize literal "null" returned by JSON_UNQUOTE
          if (
            typeof previousKey === "string" &&
            previousKey.trim().toLowerCase() === "null"
          ) {
            previousKey = null;
          }

          if (previousKey) {
            // If previousKey equals new s3Key or finalUrl, skip deletion
            if (previousKey === s3Key || previousKey === finalUrl) {
              console.info(
                `[photo-worker] previous_key equals new key — skipping delete`,
                { previousKey, s3Key }
              );
            } else {
              console.info(`[photo-worker] attempting to delete previous_key`, {
                previousKey,
                eventId,
                field,
              });
              try {
                await deleteFromS3(previousKey);
                console.info(`[photo-worker] deleted previous S3 object`, {
                  previousKey,
                  eventId,
                  field,
                });
              } catch (err) {
                console.error(
                  `[photo-worker] failed to delete previous S3 object`,
                  { previousKey, eventId, field, err: err?.message || err }
                );
                // optionally push to DLQ/cleanup queue:
                // await photoDLQ.add('s3-cleanup', { previousKey, eventId, field, when: new Date().toISOString(), error: String(err?.message || err) });
              }
            }

            // remove previous_key from occasion_data to keep JSON clean
            try {
              await sequelize.query(
                `UPDATE events SET occasion_data = JSON_REMOVE(COALESCE(occasion_data, JSON_OBJECT()), '$.${field}.previous_key'), updated_at = NOW() WHERE id = :id`,
                { replacements: { id: eventId } }
              );
            } catch (err) {
              console.warn(
                `[photo-worker] could not remove previous_key from DB for event=${eventId} field=${field}:`,
                err?.message || err
              );
            }
          } else {
            console.info(
              `[photo-worker] no previous_key found (nothing to delete)`,
              { eventId, field }
            );
          }
        } catch (err) {
          console.warn(
            `[photo-worker] error while checking/deleting previous_key for event=${eventId} field=${field}:`,
            err?.message || err
          );
        }
      } catch (error) {
        console.error(
          `[photo-worker] final DB update failed job=${job.id}:`,
          error?.message || error
        );
        // cleanup uploaded S3 object to avoid orphan on DB failure (best-effort)
        try {
          if (s3Key) await deleteFromS3(s3Key).catch(() => {});
        } catch (e) {}
        throw error;
      }

      console.info(`[photo-worker] completed job=${job.id} url=${finalUrl}`);
      return { url: finalUrl };
    },
    { connection: redisConnection, concurrency }
  );

  //? failed handler
  worker.on("failed", async (job, err) => {
    try {
      const { eventId, field } = job?.data || {};
      console.error(
        `[photo-worker] job failed id=${
          job?.id
        } event=${eventId} field=${field} err=${err?.message || err}`
      );

      if (eventId && field) {
        try {
          await sequelize.query(
            `UPDATE events SET occasion_data = JSON_SET(
               COALESCE(occasion_data, JSON_OBJECT()),
               '$.${field}.status', 'failed',
               '$.${field}.error', :msg
             ), updated_at = NOW() WHERE id = :id`,
            {
              replacements: {
                id: eventId,
                msg: String(err?.message || "error").slice(0, 400),
              },
            }
          );
        } catch (error) {
          console.warn(
            `[photo-worker] could not set failed status for event=${eventId}:`,
            error?.message || error
          );
        }
      }

      //write to DLQ
      try {
        await photoDLQ.add("dlq", {
          originalJobId: job?.id,
          jobData: job?.data,
          error: String(err?.message || err).slice(0, 400),
          when: new Date().toISOString(),
        });
      } catch (error) {
        console.warn(
          "[photo-worker] failed to write to DLQ:",
          error?.message || error
        );
      }

      //cleanup temp file if exists
      if (job?.data?.processingPath) {
        await fs.unlink(job.data.processingPath).catch(() => {});
      }
    } catch (error) {
      console.error(
        "[photo-worker] error in failed handler:",
        error?.message || error
      );
    }
  });

  worker.on("completed", (job) => {
    console.info(`[photo-worker] job completed id=${job.id}`);
  });

  console.info(`[photo-worker] started (concurrency=${concurrency})`);
  return worker;
};

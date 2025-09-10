// src/controllers/photo.controller.js
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import db from "../models/index.js";
import { photoQueue } from "../queues/photo.queue.js";

const { Event, sequelize } = db;

export const uploadPhotoToServer = async (req, res) => {
  // keep processingPath in outer scope so catch can clean it up
  let processingPath = null;

  try {
    // Require authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Allow route param to be either numeric id or slug.
    let eventIdentifier = req.params.slug ?? req.params.id;
    if (!eventIdentifier) {
      return res.status(400).json({ message: "Missing event identifier" });
    }

    // Resolve to numeric event and fetch DB row
    let event;
    let eventId;
    if (/^\d+$/.test(String(eventIdentifier))) {
      eventId = Number(eventIdentifier);
      event = await Event.findByPk(eventId);
    } else {
      const slug = String(eventIdentifier).trim();
      if (!/^[a-z0-9\-]+$/i.test(slug) || slug.length > 255)
        return res.status(400).json({ message: "Invalid event slug" });
      event = await Event.findOne({ where: { slug } });
      eventId = event ? event.id : null;
    }

    if (!event) return res.status(404).json({ message: "Event not found" });

    // ownership check — strict (no dev bypass)
    const ownerId = event.user_id ?? event.userId;
    if (String(ownerId) !== String(req.user.id))
      return res.status(403).json({ message: "Not authorized for this event" });

    // validate files
    const files = req.files || [];
    if (files.length === 0)
      return res.status(400).json({ message: "No file uploaded" });
    if (files.length > 1)
      return res.status(400).json({ message: "Only 1 file per request" });

    const chosenFile = files[0];

    // defense-in-depth mime check
    if (!/^image\/(jpg|jpeg|png)$/.test(chosenFile.mimetype)) {
      return res
        .status(400)
        .json({ message: "Invalid file type | supported: jpg, jpeg, png" });
    }

    const multerPath = chosenFile.path;

    // Prepare stable processing directory (both API + worker must be able to read it)
    const PROCESSING_DIR = path.resolve(
      process.env.PROCESSING_DIR ||
        path.join(process.cwd(), "tmp", "processing")
    );

    try {
      await fs.mkdir(PROCESSING_DIR, { recursive: true });
    } catch (err) {
      console.warn("Could not create processing dir:", err?.message || err);
    }

    // Move file to processing dir (gives it a unique name)
    const destFilename = `${Date.now()}-${path.basename(multerPath)}`;
    processingPath = path.join(PROCESSING_DIR, destFilename);

    try {
      await fs.rename(multerPath, processingPath); // atomic move on same disk
    } catch (err) {
      console.error(
        "Failed to move uploaded file to processing directory:",
        err
      );
      return res
        .status(500)
        .json({ message: "Failed to prepare file for processing" });
    }

    const userId = req.user.id;
    // simple mapping: frontend supplies bride_photo/groom_photo/photo1/photo2/photo
    const uploadedField = String(chosenFile.fieldname || "")
      .trim()
      .toLowerCase();
    const knownKeys = new Set([
      "bride_photo",
      "groom_photo",
      "photo1",
      "photo2",
      "photo",
    ]);

    if (!uploadedField || !knownKeys.has(uploadedField)) {
      return res
        .status(400)
        .json({ message: "Invalid field name for file upload" });
    }

    // sanitize field key to avoid JSON injection
    const fieldKey =
      uploadedField && knownKeys.has(uploadedField) ? uploadedField : "photo";
    const safeFieldKey = String(fieldKey).replace(/[^a-zA-Z0-9_]/g, "_");

    try {
      await fs.access(processingPath);
    } catch (error) {
      return res.status(500).json({ message: "uploaded file missing on disk" });
    }

    const jsonBase = `$.${safeFieldKey}`;

    // deterministic client-job id => idempotency
    const nameForId =
      chosenFile.filename || chosenFile.originalname || String(Date.now());
    const clientJobId = crypto
      .createHash("sha1")
      .update(`${eventId}:${safeFieldKey}:${nameForId}`)
      .digest("hex");

    // mark pending + store original_path + set job_id and COPY previous processed key (unquoted)
    await sequelize.query(
      `UPDATE events
       SET occasion_data = JSON_SET(
         COALESCE(occasion_data, JSON_OBJECT()),
         '${jsonBase}.status', 'pending',
         '${jsonBase}.original_path', :path,
         '${jsonBase}.job_id', :jid,
         '${jsonBase}.previous_key', JSON_UNQUOTE(JSON_EXTRACT(COALESCE(occasion_data, JSON_OBJECT()), '${jsonBase}.processed_key')),
         '${jsonBase}.processed_key', CAST(NULL AS JSON),
         '${jsonBase}.error', CAST(NULL AS JSON)
       ), updated_at = NOW()
     WHERE id = :id`,
      { replacements: { id: eventId, path: processingPath, jid: clientJobId } }
    );

    // enqueue the job (pass numeric eventId)
    const job = await photoQueue.add(
      "upload-and-process",
      {
        eventId,
        field: safeFieldKey,
        processingPath,
        originalName: chosenFile.originalname,
        mimeType: chosenFile.mimetype,
        uploadedBy: userId,
      },
      {
        jobId: clientJobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
      }
    );

    // store queue job id in DB (keeps worker idempotency logic consistent)
    await sequelize.query(
      `UPDATE events SET occasion_data = JSON_SET(
         COALESCE(occasion_data, JSON_OBJECT()),
         '${jsonBase}.job_id', :jid
       ) WHERE id = :id`,
      { replacements: { id: eventId, jid: job.id } }
    );

    console.info("Enqueued photo job", {
      eventId,
      processingPath,
      field: safeFieldKey,
      clientJobId,
      queueJobId: job.id,
    });

    return res.status(200).json({
      ok: true,
      clientJobId,
      queueJobId: job.id,
      message: "File accepted and queued for processing",
    });
  } catch (error) {
    console.error("uploadPhotoToServer error:", error);

    // best-effort: mark DB failed and remove temp file
    try {
      // try to resolve event id / field name gracefully in catch (fallbacks)
      let eventIdFallback = null;
      let uploadedFieldFallback = "photo";

      // try slug or id param again (don't throw)
      const eventIdentifier = req.params.slug ?? req.params.id;
      if (eventIdentifier && /^\d+$/.test(String(eventIdentifier))) {
        eventIdFallback = Number(eventIdentifier);
      } else if (eventIdentifier) {
        try {
          const eventRow = await Event.findOne({
            where: { slug: String(eventIdentifier).trim() },
          });
          if (eventRow) eventIdFallback = eventRow.id;
        } catch (e) {
          // ignore
        }
      }

      if (req.files && req.files[0] && req.files[0].fieldname) {
        uploadedFieldFallback = String(req.files[0].fieldname)
          .trim()
          .toLowerCase();
      }

      const fieldKey = [
        "bride_photo",
        "groom_photo",
        "photo1",
        "photo2",
        "photo",
      ].includes(uploadedFieldFallback)
        ? uploadedFieldFallback
        : "photo";
      const safeFieldKey = String(fieldKey).replace(/[^a-zA-Z0-9_]/g, "_");
      const jsonBase = `$.${safeFieldKey}`;

      if (eventIdFallback) {
        await sequelize.query(
          `UPDATE events SET occasion_data = JSON_SET(
             COALESCE(occasion_data, JSON_OBJECT()),
             '${jsonBase}.status', 'failed',
             '${jsonBase}.error', :msg
           ) WHERE id = :id`,
          {
            replacements: {
              id: eventIdFallback,
              msg: String(error.message || "error").slice(0, 400),
            },
          }
        );
      }

      // remove temp file only if present (best-effort)
      if (processingPath) {
        await fs.unlink(processingPath).catch(() => {});
        console.info(
          "Removed processing file after enqueue failure:",
          processingPath
        );
      }
    } catch (e) {
      console.warn(
        "Failed to mark DB failed after enqueue error:",
        e?.message || e
      );
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};

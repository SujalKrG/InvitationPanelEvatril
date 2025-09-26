import { getQueue } from "../lib/queues.js";
import { deleteFromS3 } from "../utils/s3.js";
import ApiError from "../utils/apiError.js";
import * as themeRepo from "../repositories/theme.repository.js";
import * as userThemeRepo from "../repositories/userTheme.repository.js";
import * as eventRepo from "../repositories/event.repository.js";
import * as occasionRepo from "../repositories/occasion.repository.js";

export async function createAndQueueUserTheme({
  userId,
  filePath,
  originalName,
  mimeType,
  extraData = {},
  eventSlug = null,
  themeSlug = null,
  occasionSlug = null,
}) {
  if (!userId) throw new Error("User not authenticated");
  if (!filePath) throw new Error("Missing file path");

  let event = null;
  let theme = null;
  let occasion = null;
  let purchasedPrice = 0.0;

  //! Case A: user uploads based on event + theme
  if (eventSlug && themeSlug) {
    event = await eventRepo.findBySlug(eventSlug);
    if (!event) throw new Error("Event not found");
    if (Number(event.user_id) !== Number(userId)) {
      throw new Error("You do not own this event");
    }

    theme = await themeRepo.findThemeBySlug(themeSlug);
    if (!theme) throw new Error("Theme not found");

    if (Number(theme.occasion_id) !== Number(event.occasion_id)) {
      throw new Error("Theme does not belong to this event's occasion");
    }

    // Price logic
    purchasedPrice = theme.offer_price ?? theme.base_price ?? 0.0;

    // No explicit occasion needed, event already has it
    occasion = null;
  }

  //! Case B: standalone upload (no event)
  else {
    if (!occasionSlug)
      throw new Error("Occasion slug is required for standalone uploads");

    occasion = await occasionRepo.findBySlug(occasionSlug);
    if (!occasion) throw new Error("Occasion not found");

    theme = null; // no premade theme
    purchasedPrice = 0.0;
  }

  console.log("createAndQueueUserTheme userId:", userId);
  console.log("payload for createUserThemeRow:", {
    userId,
    eventId: event?.id || null,
    themeId: theme?.id || null,
    occasionId: occasion?.id || null,
    purchasedPrice,
    extraData,
  });

  // 1) Create DB row
  const row = await userThemeRepo.createUserThemeRow({
    user_id: userId,
    event_id: event?.id || null,
    theme_id: theme?.id || null,
    occasion_id: occasion?.id || null,
    purchased_price: purchasedPrice,
    extra_data: extraData,
  });

  // 2) Add job to BullMQ queue
  const queue = getQueue("usertheme-queue");
  const job = await queue.add("upload", {
    userThemeId: row.id,
    processingPath: filePath,
    originalName,
    mimeType,
  });

  // 3) Save jobId + mimeType in upload_meta
  await userThemeRepo.mergeUploadMeta(row.id, {
    job_id: job.id,
    mime_type: mimeType,
    status: "pending",
  });

  return { row, jobId: job.id };
}

export async function updateUserTheme({
  userThemeId,
  userId,
  extraData,
  newFile,
}) {
  if (!userThemeId) throw ApiError.badRequest("UserTheme id is required");
  if (!userId) throw ApiError.unauthorized("Unauthorized");

  // Step 1: Get the existing row
  const row = await userThemeRepo.findById(userThemeId);
  if (!row) {
    throw ApiError.notFound("UserTheme not found");
  }
  if (Number(row.user_id) !== Number(userId)) {
    throw ApiError.forbidden("You don’t own this theme");
  }

  // NOTE: DO NOT delete old S3 file here. Worker will handle deletion after success.

  // Step 2: Update safe DB fields immediately (extra_data only)
  await userThemeRepo.updateUserTheme(userThemeId, {
    extra_data: extraData,
  });

  // Step 3: Get previous processed S3 key (if any) so worker can delete after success
  const prevProcessedKey = await userThemeRepo.getPreviousProcessedKey(
    userThemeId
  ); // may be null

  // Step 4: Queue the new file for upload. Include prevProcessedKey in job data.
  const queue = getQueue("usertheme-queue");
  const job = await queue.add("upload", {
    userThemeId,
    processingPath: newFile.path,
    originalName: newFile.originalName,
    mimeType: newFile.mimeType,
    prevProcessedKey, // worker will delete this AFTER successful upload
  });

  // Step 5: Update upload_meta to indicate pending upload
  await userThemeRepo.mergeUploadMeta(userThemeId, {
    job_id: job.id,
    mime_type: newFile.mimeType,
    status: "pending",
  });

  console.log("enqueue update job", {
    userThemeId,
    jobId: job.id,
    prevProcessedKey,
  });

  return { message: "UserTheme update queued", jobId: job.id };
}

export async function getUserThemes(userId) {
  const userThemes = await userThemeRepo.listUserThemes(userId);

  // collect occasion_ids
  const occasionIds = [
    ...new Set(userThemes.map((ut) => ut.event?.occasion_id).filter(Boolean)),
  ];

  function cleanOccasionName(name) {
    if (!name) return null;
    return String(name).replace(/^"+|"+$/g, ""); // removes leading/trailing quotes
  }

  // fetch occasions from remote db
  const occasions = await occasionRepo.findByMultipleIds(occasionIds);
  const occasionMap = {};
  occasions.forEach((o) => {
    occasionMap[o.id] = o.name;
  });

  // map into clean response
  return userThemes.map((ut) => ({
    userThemeId: ut.id,
    fileUrl: ut.file_url,
    eventTitle: ut.event?.title || null,
    eventDateTime: ut.event?.event_datetime || null,
    occasionName: cleanOccasionName(occasionMap[ut.event?.occasion_id]) || null,
  }));
}

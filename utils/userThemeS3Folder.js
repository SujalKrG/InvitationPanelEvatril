import fs from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { detectFileTypeFromPath } from "../utils/validateFileSignature.js";
import { getUserThemeS3Folder } from "./s3FolderHelper.js";
import { uploadToS3 } from "./s3.js";

export async function uploadUserThemeToS3({
  processingPath,
  originalName = null,
  mimeType = null,
  strict = false,
} = {}) {
  if (!processingPath) throw new Error("Missing processingPath");

  // detect
  const detected = await detectFileTypeFromPath(processingPath).catch(
    () => null
  );
  const detectedMime = detected?.mime || null;
  const effectiveMime = detectedMime || mimeType || "application/octet-stream";

  // folder
  const folder = getUserThemeS3Folder(effectiveMime);

  // 4) derive short folder name (Card | SaveTheDate | Video | Other)
  const shortFolder =
    String(folder).split("/").filter(Boolean).pop() || "Other";

  // mimeMatch
  const m = (effectiveMime || "").toLowerCase();
  let mimeMatch = false;
  if (shortFolder === "SaveTheDate")
    mimeMatch = m === "image/jpeg" || m === "image/jpg";
  else if (shortFolder === "Card") mimeMatch = m === "application/pdf";
  else if (shortFolder === "Video") mimeMatch = m.startsWith("video/");
  else mimeMatch = true;

  if (strict && !mimeMatch)
    throw new Error(
      `Mime type ${effectiveMime} does not match folder ${folder}`
    );

  // filename & ext
  const safeBase = (originalName || `file-${Date.now()}`)
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_.]/g, "");
  const ext = detected?.ext
    ? `.${detected.ext}`
    : path.extname(originalName || "") ||
      (m.startsWith("image/") ? ".jpg" : ".bin");
  const uploadFilename = `${Date.now()}-${safeBase}-${nanoid(6)}${ext}`;

  // read & upload
  const buffer = await fs.readFile(processingPath);
  const uploadRes = await uploadToS3(
    buffer,
    uploadFilename,
    effectiveMime,
    folder
  );

  return {
    Key: uploadRes.Key || uploadRes.key || null,
    url: uploadRes.url || uploadRes.Location || null,
    folder,
    detectedMime: effectiveMime,
    mimeMatch,
  };
}

export async function deleteLocalFile(filePath) {
  if (!filePath) return false;
  try {
    await fs.unlink(filePath).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export default { uploadUserThemeToS3, deleteLocalFile };

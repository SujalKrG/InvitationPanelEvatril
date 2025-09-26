import fs from "fs/promises";
import { fileTypeFromBuffer } from "file-type";

export async function detectFileTypeFromPath(filePath) {
  const handle = await fs.open(filePath, "r");
  try {
    const { buffer } = await handle.read({ length: 4100, position: 0 });
    const ft = await fileTypeFromBuffer(buffer);
    return ft || null;
  } finally {
    await handle.close();
  }
}

export function ensureDetectedMimeAllowed(allowedSet) {
  return async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const detected = await detectFileTypeFromPath(file.path);
      if (!detected || !allowedSet.has(detected.mime)) {
        //delete tmp file
        await fs.unlink(file.path).catch(() => {});
        return res
          .status(400)
          .json({ message: "File content does not match allowed types" });
      }

      // optionally, attach detected mime/extension to req.file for later use
      req.file.detectedMime = detected.mime;
      req.file.detectedExt = detected.ext;
      return next();
    } catch (error) {
      console.error("ensureDetectedMimeAllowed error:", error);
      // try cleanup if possible
      if (req.file && req.file.path)
        await fs.unlink(req.file.path).catch(() => {});
      return res.status(500).json({ message: "file validation failed" });
    }
  };
}

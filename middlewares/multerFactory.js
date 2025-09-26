import multer from "multer";
import path from "path";
import fs from "fs";

const tmpBase =
  process.env.TMP_UPLOAD_DIR || path.join(process.cwd(), "tmp", "uploads");
fs.mkdirSync(tmpBase, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpBase),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".bin";
    const name = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

/**
 * createMulter(allowedMimes, maxBytes)
 * returns multer instance filtered for allowed mime types + limit
 */

export function createMulter(allowedMimes = [], maxBytes = 50 * 1024 * 1024) {
  const ALLOWED = new Set(allowedMimes);
  return multer({
    storage,
    limits: { fileSize: Number(process.env.USER_THEME_MAX_BYTES || maxBytes) },
    fileFilter: (req, file, cb) => {
      if (ALLOWED.has(file.mimetype)) cb(null, true);
      else cb(new Error("Unsupported file type"));
    },
  });
}

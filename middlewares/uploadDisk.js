import multer from "multer";
import path from "path";
import fs from "fs";

const tmpBase =
  process.env.TMP_UPLOAD_DIR || path.join(process.cwd(), "tmp", "uploads");
fs.mkdirSync(tmpBase, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpBase),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const name = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

export const uploadDisk = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024),
  },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only jpeg/png files are allowed"));
  },
});

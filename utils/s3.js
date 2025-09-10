import {
  S3Client,
  ListBucketsCommand,
  HeadBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import dotenv from "dotenv";
dotenv.config();

// ✅ Reuse this everywhere
export const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ✅ Test: list buckets
export const verifyS3Connection = async () => {
  try {
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    console.log("✅ Connected to AWS S3 ");
    return true;
  } catch (error) {
    console.error("❌ AWS S3 connection failed:", error.message);
    return false;
  }
};

// ✅ Upload utility (we’ll use this later with multer + sharp)
export const uploadToS3 = async (
  fileBuffer,
  fileName,
  mimeType,
  folder = "misc"
) => {
  const safeName = fileName.replace(/\s+/g, "-"); // replace spaces
  const Key = `invitation/${folder}/${Date.now()}-${nanoid(6)}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
  const url = `${process.env.AWS_URL.replace(/\/$/, "")}/${Key}`;

  return { Key, url };
};

export const deleteFromS3 = async (maybeKeyOrUrl) => {
  if (!maybeKeyOrUrl) return false;

  // Normalize: accept either a Key like "invitation/events/..." or a full URL
  let Key = String(maybeKeyOrUrl).trim();

  // If it looks like a full http(s) URL, extract pathname and remove leading slashes
  if (/^https?:\/\//i.test(Key)) {
    try {
      const u = new URL(Key);
      Key = u.pathname.replace(/^\/+/, "");
    } catch (err) {
      // fallback to original string (will likely fail)
      Key = String(maybeKeyOrUrl).trim();
    }
  } else {
    // Also handle the case where the DB stored a URL built from AWS_URL env (no protocol)
    const awsUrl = (process.env.AWS_URL || "").replace(/\/+$/, "");
    if (awsUrl && Key.startsWith(awsUrl)) {
      Key = Key.slice(awsUrl.length).replace(/^\/+/, "");
    }
    // strip any leading slash
    Key = Key.replace(/^\/+/, "");
  }

  if (!Key) {
    console.warn("deleteFromS3: normalized Key is empty, skipping");
    return false;
  }

  try {
    const cmd = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key,
    });

    console.info(`deleteFromS3: deleting S3 object Key=${Key}`);
    await s3Client.send(cmd);
    console.info(`deleteFromS3: delete successful Key=${Key}`);
    return true;
  } catch (error) {
    console.error("deleteFromS3 error: ", error?.message || error);
    throw error;
  }
};

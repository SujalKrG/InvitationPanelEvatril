import ApiError from "../utils/apiError.js";

export default function errorHandler(err, req, res, next) {
  // If it's an ApiError, use its status/message
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }

  // Otherwise fallback to 500
  console.error("❌ Unexpected error:", err);
  return res.status(500).json({
    message: "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
}

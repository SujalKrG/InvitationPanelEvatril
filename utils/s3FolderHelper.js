/**
 * Decide which folder inside "invitation/user-themes/" to use
 * based only on the mime type.
 */
export function getUserThemeS3Folder(mimeType) {
  if (!mimeType) return "invitation/user-themes/Other";

  const m = mimeType.toLowerCase();

  if (m.startsWith("video/")) return "user-themes/Video";
  if (m === "application/pdf") return "user-themes/Card";
  if (m.startsWith("image/")) return "user-themes/SaveTheDate";

  return "invitation/user-themes/Other";
}

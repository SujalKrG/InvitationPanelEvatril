import sanitizeHTML from "sanitize-html";

export default function sanitize(input) {
  if (typeof input !== "string") return input;

  return sanitizeHTML(input, { allowedTags: [], allowedAttributes: {} }).trim();
}

// utils/eventUtils.js
import slugify from "slugify";

// Detect type of occasion based on slug
const detectOccasionType = (occasionRow = {}) => {
  const raw = String(
    occasionRow?.slug || occasionRow?.key || occasionRow?.name || ""
  ).toLowerCase();

  if (raw.includes("wedding")) return "wedding";
  if (raw.includes("engagement")) return "engagement";
  if (raw.includes("anniversary")) return "anniversary";
  return "single";
};

// Join two names with " & " or fallback
const joinTwo = (a = "", b = "") => {
  const A = a.trim();
  const B = b.trim();
  if (A && B) return `${A} & ${B}`;
  return A || B || "";
};

// Build the name part according to type
export const buildNamePart = (occasionRow = {}, payload = {}) => {
  const type = detectOccasionType(occasionRow);

  if (type === "wedding") {
    const bride = payload.bride_name?.trim() || "";
    const groom = payload.groom_name?.trim() || "";
    const who = (payload.who_is_creating || "").toLowerCase();

    return who === "bride" ? joinTwo(bride, groom) : joinTwo(groom, bride);
  }

  if (type === "engagement") {
    const brideToBe = payload.bride_to_be_name?.trim() || "";
    const groomToBe = payload.groom_to_be_name?.trim() || "";
    const who = (payload.who_is_creating || "").toLowerCase();

    return who === "bride_to_be" || who === "bride"
      ? joinTwo(brideToBe, groomToBe)
      : joinTwo(groomToBe, brideToBe);
  }

  if (type === "anniversary") {
    const n1 = payload.name1?.trim() || "";
    const n2 = payload.name2?.trim() || "";
    return joinTwo(n1, n2);
  }

  // default single-name occasions
  return payload.name?.trim() || "Guest";
};

// Build full event title using DB suffix
export const getEventTitle = (occasionRow = {}, payload = {}) => {
  const suffix = (
    occasionRow?.title_suffix ||
    occasionRow?.titleSuffix ||
    "Event"
  ).trim();
  const namePart = buildNamePart(occasionRow, payload) || "Guest";
  return `${namePart} ${suffix}`.trim();
};

// Generate slug from title
export const generateEventSlug = (title) => {
  const unique = `${Date.now() % 100000}${Math.floor(Math.random() * 90 + 10)}`;
  const clean = title.replace(/&/g, " ");
  const base = slugify(clean, { lower: true, strict: true }) || "event";
  return `${base}-${unique}`;
};

export default { buildNamePart, getEventTitle, generateEventSlug };

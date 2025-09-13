import slugify from "slugify";

// small title-casing helper
export const toTitleCase = (str = "") => {
  if (!str || typeof str !== "string") return "";
  // normalize whitespace, trim
  const cleaned = str.trim().replace(/\s+/g, " ");

  // split on spaces but keep internal hyphens as part of words (e.g., "mother-in-law")
  return cleaned
    .split(" ")
    .map((token) =>
      token
        .split("-") // handle hyphenated words
        .map((part) =>
          part.length === 1
            ? part.toUpperCase()
            : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join("-")
    )
    .join(" ");
};

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
  const suffixRaw = String(
    occasionRow?.title_suffix || occasionRow?.titleSuffix || "Event"
  ).trim();
  const namePartRaw = buildNamePart(occasionRow, payload) || "Guest";

  const namePart = toTitleCase(namePartRaw);
  const suffix = toTitleCase(suffixRaw);

  return `${namePart} ${suffix}`.trim();
};

// Generate slug from title
export const generateEventSlug = (title) => {
  const unique = `${Date.now() % 100000}${Math.floor(Math.random() * 90 + 10)}`;
  const clean = title.replace(/&/g, " ");
  const base = slugify(clean, { lower: true, strict: true }) || "event";
  return `${base}-${unique}`;
};

export default { buildNamePart, getEventTitle, generateEventSlug, toTitleCase };

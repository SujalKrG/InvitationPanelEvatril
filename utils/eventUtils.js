import slugify from "slugify";

//! Title templates for different occasions
const TITLE_TEMPLATE = {
  wedding: (data) => {
    const bride = data.bride_name ?? "Bride";
    const groom = data.groom_name ?? "Groom";
    if (data.who_is_creating === "bride") {
      return `${bride} & ${groom} Wedding Ceremony`;
    }
    return `${groom} & ${bride} Wedding Ceremony`;
  },
  anniversary: (data) =>
    `${data.name1 ?? "Name1"} & ${
      data.name2 ?? "Name2"
    } Anniversary Celebration`,
  birthday: (data) => `${data.name}'s Birthday Celebration`,
  "engagement-ceremony": (data) =>
    `${data.groom_name} & ${data.bride_name} Engagement Party`,
  "baby-shower": (data) => `${data.mother_name}'s Baby Shower`,
  graduation: (data) => `${data.name}'s Graduation Ceremony`,
  default: (data) => `Custom Event`,
};

const normalizeSlug = (slug) => {
  if (slug.includes("wedding")) return "wedding";
};

//! Get event title based on occasion and data
export const getEventTitle = (occasionSlug, occasionData) => {
  const normalized = normalizeSlug(occasionSlug);
  const template = TITLE_TEMPLATE[normalized] || TITLE_TEMPLATE["default"];
  return template ? template(occasionData) : "Unknown Event";
};

//! Generate a unique slug for the event
export const generateEventSlug = (title) => {
  const suffix = (Date.now() % 100000) + Math.floor(Math.random() * 90 + 10);
  const cleanTitle = title.replace(/&/g, " "); // replace & with space
  return slugify(cleanTitle, { lower: true, strict: true }) + "-" + suffix;
};

// Debug example
const title = getEventTitle("wedding", {
  who_is_creating: "groom",
  bride_name: "Priya",
  groom_name: "Rahul",
});
console.log(
  "http://localhost:8000/occasion/hindu-wedding/" + generateEventSlug(title)
);

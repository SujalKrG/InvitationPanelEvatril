import * as service from "../services/theme.service.js";

const sanitizeName = (s) =>
  typeof s === "string"
    ? s
        .replace(/\\/g, "") // remove any backslashes
        .replace(/^["']+|["']+$/g, "") // strip leading/trailing quotes
        .trim()
    : s;

const sanitizeEvent = (e) => {
  if (!e) return null;
  return e.slug ?? null;
};

export const getThemesBySlug = async (req, res) => {
  try {
    const rawOcc = req.params.occasionSlug ?? "";
    const rawEvent = req.params.eventSlug ?? "";
    const rawCategory = req.query.category ?? "";

    // remove surrounding quotes and trim
    const clean = (s) =>
      typeof s === "string" ? s.replace(/^["']+|["']+$/g, "").trim() : s;

    const occasionSlug = clean(rawOcc);
    const eventSlug = clean(rawEvent);
    const categorySlug = clean(rawCategory);

    const currentUserId = req.user?.id || null;

    const payload = await service.getThemeBySlug({
      occasionSlug,
      eventSlug,
      categorySlug,
      currentUserId,
    });
    return res.json(payload);
  } catch (err) {
    console.error("getThemesBySlug error:", err);
    const status = err?.status || 500;
    const message = err?.message || "Something went wrong";
    return res.status(status).json({ message });
  }
};

export const getThemeByThemeAndEventSlug = async (req, res) => {
  try {
    const themeSlug = (req.params.themeSlug || "").trim();
    const eventSlug = (req.params.eventSlug || "").trim();
    const currentUserId = req.user?.id || null;

    const payload = await service.getThemeByThemeAndEventSlug({
      themeSlug,
      eventSlug,
      currentUserId,
    });
    return res.json(payload);
  } catch (err) {
    console.error("getThemeByThemeAndEventSlug error:", err);
    const status = err?.status || 500;
    const message = err?.message || "Something went wrong";
    return res.status(status).json({ message });
  }
};

import { raw } from "mysql2";
import db from "../models/index.js";

const { Theme, ThemeCategory, Occasion, Event, Country } = db;

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
    const occasionSlug = req.params.occasionSlug?.trim();
    const eventSlug = (req.params.eventSlug || "").trim();
    const categorySlug = req.query.category?.trim();

    if (!occasionSlug) {
      return res.status(400).json({ message: "Missing occasion in path" });
    }
    if (!eventSlug) {
      return res.status(400).json({ message: "Missing event in path" });
    }
    if (!categorySlug) {
      return res.status(400).json({
        message: "Missing required query param: ?category=<category-slug>",
      });
    }

    // validate occasion
    const occasion = await Occasion.findOne({
      where: { slug: occasionSlug, invitation_status: true },
    });
    if (!occasion) {
      return res.status(404).json({ message: "Occasion not found" });
    }

    const event = await Event.findOne({
      where: { slug: eventSlug },
      raw: true,
    });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // 2) validate category
    const category = await ThemeCategory.findOne({
      where: { slug: categorySlug, status: true },
    });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    //  ownership check (ensure the logged-in user owns the event)
    if (req.user && Number(event.user_id) !== Number(req.user.id)) {
      return res
        .status(403)
        .json({ message: "You don't have access to this event" });
    }

    //  ensure event belongs to the requested occasion
    if (Number(event.occasion_id) !== Number(occasion.id)) {
      return res.status(400).json({
        message: `Event does not belong to occasion "${occasion.slug}"`,
      });
    }

    // 3) optional domain check: ensure types align (if you use 'type' to partition domain)
    if (occasion.type && category.type && occasion.type !== category.type) {
      return res.status(400).json({
        message: `Category "${category.slug}" is not valid for occasion "${occasion.slug}"`,
      });
    }

    // 5) fetch themes filtered by both occasion and category — no themeCategory include
    const themes = await Theme.findAll({
      where: {
        occasion_id: occasion.id,
        category_id: category.id,
        status: true,
      },
      order: [["created_at", "DESC"]],
      attributes: [
        "id",
        "name",
        "slug",
        "preview_image",
        "preview_video",
        "component_name",
        "config",
        "base_price",
        "offer_price",
        "currency",
        "status",
        "created_at",
      ],
      raw: true, // expose only fields you want
    });

    // get unique currencies from themes (e.g. ["INR","USD"])
    const currencies = [
      ...new Set(
        themes
          .map((t) => (t.currency || "").trim().toUpperCase())
          .filter(Boolean)
      ),
    ];

    // fetch symbols for those currencies in one query
    let currencyMap = {};
    if (currencies.length) {
      const rows = await Country.findAll({
        where: { currency: currencies },
        attributes: ["currency", "currency_symbol"],
        raw: true,
      });
      rows.forEach((r) => {
        currencyMap[(r.currency || "").trim().toUpperCase()] =
          r.currency_symbol ?? null;
      });
    }

    // attach currency_symbol to each theme
    const themesWithSymbols = themes.map((t) => {
      const code = (t.currency || "").trim().toUpperCase();
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        preview_image: t.preview_image,
        preview_video: t.preview_video,
        component_name: t.component_name,
        config: t.config,
        base_price: t.base_price,
        offer_price: t.offer_price,
        currency: code,
        currency_symbol: currencyMap[code] ?? "",
        status: t.status,
        created_at: t.created_at,
      };
    });

    return res.json({
      occasion: {
        id: occasion.id,
        name: sanitizeName(occasion.name) ?? null,
        slug: occasion.slug,
      },

      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        type: category.type ?? null,
      },
      eventSlug: sanitizeEvent(event),
      themes: themesWithSymbols,
    });
  } catch (error) {
    console.error("getThemesBySlug error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getThemeByThemeAndEventSlug = async (req, res) => {
  try {
    const themeSlug = (req.params.themeSlug || "").trim();
    const eventSlug = (req.params.eventSlug || "").trim();

    if (!themeSlug) {
      return res.status(400).json({ message: "Missing theme in path" });
    }
    if (!eventSlug) {
      return res.status(400).json({ message: "Missing event in path" });
    }

    // load theme (active)
    const theme = await Theme.findOne({
      where: { slug: themeSlug, status: true },
      attributes: [
        "id",
        "occasion_id",
        "category_id",
        "name",
        "slug",
        "preview_image",
        "preview_video",
        "component_name",
        "config",
        "base_price",
        "offer_price",
        "currency",
        "status",
        "created_at",
        "updated_at",
      ],
      raw: true,
    });
    if (!theme) return res.status(404).json({ message: "Theme not found" });

    // load event
    const event = await Event.findOne({
      where: { slug: eventSlug },
      attributes: [
        "id",
        "slug",
        "title",
        "user_id",
        "occasion_id",
        "event_datetime",
        "venue_name",
        "venue_address",
        "occasion_data",
        "created_at",
        "updated_at",
      ],
      raw: true,
    });
    if (!event) return res.status(404).json({ message: "Event not found" });

    // ownership check (ensure logged-in user owns the event)
    if (req.user && Number(event.user_id) !== Number(req.user.id)) {
      return res
        .status(403)
        .json({ message: "You don't have access to this event" });
    }

    // ensure theme matches event occasion
    if (Number(theme.occasion_id) !== Number(event.occasion_id)) {
      return res
        .status(400)
        .json({ message: "Theme does not belong to this event's occasion" });
    }

    // get currency symbol for theme currency
    let currencySymbol = "";
    const currencyCode = (theme.currency || "").trim().toUpperCase();
    if (currencyCode) {
      const countryRow = await Country.findOne({
        where: { currency: currencyCode },
        attributes: ["currency_symbol"],
        raw: true,
      });
      currencySymbol = countryRow?.currency_symbol ?? "";
    }

    // sanitize theme payload
    const sanitizeThemeForEdit = (t, currencySymbolLocal = "") => {
      if (!t) return null;
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        preview_image: t.preview_image,
        preview_video: t.preview_video,
        component_name: t.component_name,
        config: t.config ?? null,
        base_price: t.base_price,
        offer_price: t.offer_price,
        currency: (t.currency || "").trim().toUpperCase(),
        currency_symbol: currencySymbolLocal ?? "",
        status: t.status,
        created_at: t.created_at,
        updated_at: t.updated_at,
      };
    };

    // sanitize event payload (full event object for editor)
    const sanitizeEventFull = (ev) => {
      if (!ev) return null;
      return {
        id: ev.id,
        slug: ev.slug,
        title: ev.title,
        occasion_id: ev.occasion_id,
        event_datetime: ev.event_datetime,
        venue_name: ev.venue_name,
        venue_address: ev.venue_address,
        occasion_data: ev.occasion_data ?? null,
        created_at: ev.created_at,
        updated_at: ev.updated_at,
      };
    };

    const themePayload = sanitizeThemeForEdit(theme, currencySymbol);
    const eventPayload = sanitizeEventFull(event);

    return res.json({
      themeData: themePayload,
      eventData: eventPayload,
    });
  } catch (error) {
    console.error("getThemeByThemeAndEventSlug error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

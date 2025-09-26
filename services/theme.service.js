import * as repo from "../repositories/theme.repository.js";

const sanitizeName = (s) =>
  typeof s === "string"
    ? s
        .replace(/\\/g, "")
        .replace(/^["']+|["']+$/g, "")
        .trim()
    : s;

const sanitizeEventSlug = (e) => {
  if (!e) return null;
  return e.slug ?? null;
};

export const getThemeBySlug = async ({
  occasionSlug,
  eventSlug,
  categorySlug,
  currentUserId = null,
}) => {
  if (!occasionSlug) throw new Error("Missing occasion");
  if (!eventSlug) throw new Error("Missing event");
  if (!categorySlug) throw new Error("Missing category");

  const occasion = await repo.findOccasionBySlug(occasionSlug);
  if (!occasion)
    throw Object.assign(new Error("Occasion not found"), { status: 404 });

  const event = await repo.findEventBySlug(eventSlug);
  if (!event)
    throw Object.assign(new Error("Event not found"), { status: 404 });

  const category = await repo.findCategoryBySlug(categorySlug);
  if (!category)
    throw Object.assign(new Error("Category not found"), { status: 404 });

  // ownership check
  if (currentUserId && Number(event.user_id) !== Number(currentUserId)) {
    throw Object.assign(new Error("You don't have access to this event"), {
      status: 403,
    });
  }

  // ensure event belongs to occasion
  if (Number(event.occasion_id) !== Number(occasion.id)) {
    throw Object.assign(
      new Error(`Event does not belong to occasion "${occasion.slug}"`),
      { status: 400 }
    );
  }

  // domain/type check
  if (occasion.type && category.type && occasion.type !== category.type) {
    throw Object.assign(
      new Error(
        `Category "${category.slug}" is not valid for occasion "${occasion.slug}"`
      ),
      { status: 400 }
    );
  }

  const themes = await repo.findThemesByOccasionAndCategory(
    occasion.id,
    category.id
  );

  // currency symbol lookup
  const currencies = [
    ...new Set(
      themes.map((t) => (t.currency || "").trim().toUpperCase()).filter(Boolean)
    ),
  ];
  let currencyMap = {};
  if (currencies.length) {
    const rows = await repo.findCountriesByCurrencies(currencies);
    rows.forEach((r) => {
      currencyMap[(r.currency || "").trim().toUpperCase()] =
        r.currency_symbol ?? "";
    });
  }

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

  return {
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
    eventSlug: sanitizeEventSlug(event),
    themes: themesWithSymbols,
  };
};

export const getThemeByThemeAndEventSlug = async ({
  themeSlug,
  eventSlug,
  currentUserId = null,
}) => {
  if (!themeSlug) throw new Error("Missing theme");
  if (!eventSlug) throw new Error("Missing event");

  const theme = await repo.findThemeBySlug(themeSlug);
  if (!theme)
    throw Object.assign(new Error("Theme not found"), { status: 404 });

  const event = await repo.findEventBySlug(eventSlug);
  if (!event)
    throw Object.assign(new Error("Event not found"), { status: 404 });

  // ownership check
  if (currentUserId && Number(event.user_id) !== Number(currentUserId)) {
    throw Object.assign(new Error("You don't have access to this event"), {
      status: 403,
    });
  }

  // ensure theme matches event occasion
  if (Number(theme.occasion_id) !== Number(event.occasion_id)) {
    throw Object.assign(
      new Error("Theme does not belong to this event's occasion"),
      { status: 400 }
    );
  }

  const currencyCode = (theme.currency || "").trim().toUpperCase();
  let currencySymbol = "";
  if (currencyCode) {
    const countryRow = await repo.findCountryByCurrency(currencyCode);
    currencySymbol = countryRow?.currency_symbol ?? "";
  }

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

  return {
    themeData: sanitizeThemeForEdit(theme, currencySymbol),
    eventData: sanitizeEventFull(event),
  };
};

import db from "../models/index.js";
import { Op } from "sequelize";
const { Theme, ThemeCategory, Occasion, Event, Country } = db;

export const findOccasionBySlug = async (slug) => {
  if (!slug) return null;
  return Occasion.findOne({
    where: {
      slug,
      // tolerate boolean-like values stored as true, "true", 1, or "1"
      invitation_status: {
        [Op.or]: [true, "true", 1, "1"],
      },
    },
    raw: true,
  });
};

export const findEventBySlug = async (slug) => {
  if (!slug) return null;
  return Event.findOne({ where: { slug }, raw: true });
};

export const findCategoryBySlug = async (slug) => {
  if (!slug) return null;
  return ThemeCategory.findOne({ where: { slug, status: true } });
};

export const findThemesByOccasionAndCategory = async (
  occasionId,
  categoryId,
  opts = {}
) => {
  const limit = opts.limit || null;
  return Theme.findAll({
    where: { occasion_id: occasionId, category_id: categoryId, status: true },
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
    order: [["created_at", "DESC"]],
    raw: true,
    ...(limit ? { limit } : {}),
  });
};

export const findCountriesByCurrencies = async (currencyCodes = []) => {
  if (!currencyCodes.length) return [];
  return Country.findAll({
    where: { currency: currencyCodes },
    attributes: ["currency", "currency_symbol"],
    raw: true,
  });
};

export const findThemeBySlug = async (themeSlug) => {
  if (!themeSlug) return null;
  return Theme.findOne({
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
};

export const findThemeCategoryById = async (categoryId) => {
  if (!categoryId) return null;
  return ThemeCategory.findOne({
    where: { id: categoryId },
    attributes: ["id", "name", "slug", "type"],
    raw: true,
  });
};

export const findCountryByCurrency = async (currencyCode) => {
  if (!currencyCode) return null;
  return Country.findOne({
    where: { currency: currencyCode },
    attributes: ["currency_symbol"],
    raw: true,
  });
};

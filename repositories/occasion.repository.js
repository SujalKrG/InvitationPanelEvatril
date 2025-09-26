import db from "../models/index.js";

const { Occasion } = db;

export async function findBySlug(slug) {
  if (!slug) return null;
  return Occasion.findOne({
    where: { slug, invitation_status: true },
    raw: true,
  });
}

export async function findById(id) {
  if (!id) return null;
  return Occasion.findByPk(id, { raw: true });
}

export async function findByMultipleIds(ids) {
  if (!ids || !ids.length) return [];
  return Occasion.findAll({
    where: { id: ids },
    raw: true,
  });
}

import db from "../models/index.js";

const { Event } = db;

export async function findBySlug(slug) {
  if (!slug) return null;
  return Event.findOne({ where: { slug }, raw: true });
}

export async function findById(id) {
  if (!id) return null;
  return Event.findByPk(id, { raw: true });
}

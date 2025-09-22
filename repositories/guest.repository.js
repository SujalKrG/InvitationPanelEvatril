import { Op } from "sequelize";
import db from "../models/index.js";

const { GuestDirectories, GuestGroups, sequelize } = db;

export const findByIdAndUser = async (guestId, userId) => {
  return GuestDirectories.findOne({ where: { id: guestId, user_id: userId } });
};

export const findByUserCountryPhone = async (
  userId,
  country_code,
  phone,
  excludeId = null
) => {
  const where = { user_id: userId, country_code, phone };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return GuestDirectories.findOne({ where });
};

export const updateGuest = async (guestInstance, updates) => {
  Object.assign(guestInstance, updates);
  return guestInstance.save();
};

// optional: raw fetch helper
export const findByIdPlain = async (id, userId) => {
  return GuestDirectories.findOne({
    where: { id, user_id: userId },
    raw: true,
  });
};

// 🔹 NEW: fetch unassigned guests
export const findUnassignedForUser = async (userId) => {
  return GuestDirectories.findAll({
    where: { user_id: userId, group_id: null },
    order: [["created_at", "DESC"]],
    attributes: ["id", "name", "country_code", "phone", "created_at"],
    raw: true,
  });
};

export default {
  findByIdAndUser,
  findByUserCountryPhone,
  updateGuest,
  findByIdPlain,
  findUnassignedForUser,
};

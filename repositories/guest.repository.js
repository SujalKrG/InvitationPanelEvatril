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

export default {
  findByIdAndUser,
  findByUserCountryPhone,
  updateGuest,
  findByIdPlain,
};

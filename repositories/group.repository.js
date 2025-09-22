import db from "../models/index.js";
import { Op } from "sequelize";

const { GuestGroups, GuestDirectories } = db;

export const findAccessibleById = async (groupId, userId) => {
  return GuestGroups.findOne({
    where: {
      id: groupId,
      [Op.or]: [{ user_id: userId }, { user_id: null }],
    },
    raw: true,
  });
};

export const existsGlobalByName = async (name) => {
  return GuestGroups.findOne({ where: { user_id: null, name }, raw: true });
};

export const existsUserByName = async (userId, name) => {
  return GuestGroups.findOne({ where: { user_id: userId, name }, raw: true });
};

// NEW: fetch groups (user's + defaults) with that user's guests included
export const findGroupsWithGuestsForUser = async (userId) => {
  // include only that user's GuestDirectories
  return GuestGroups.findAll({
    where: {
      [Op.or]: [{ user_id: userId }, { user_id: null }],
    },
    include: [
      {
        model: GuestDirectories,
        as: "guests",
        where: { user_id: userId },
        required: false,
        attributes: [
          "id",
          "name",
          "country_code",
          "phone",
          "group_id",
          "created_at",
        ],
      },
    ],
    order: [
      // optional: show user's groups first then defaults (change as you like)
      ["user_id", "DESC"],
      ["created_at", "ASC"],
      [{ model: GuestDirectories, as: "guests" }, "created_at", "ASC"],
    ],
  });
};

export default {
  findAccessibleById,
  existsGlobalByName,
  existsUserByName,
  findGroupsWithGuestsForUser,
};

import db from "../models/index.js";
import { Op } from "sequelize";

const { GuestGroups } = db;

export const findAccessibleById = async (groupId, userId) => {
  return GuestGroups.findOne({
    where: {
      id: groupId,
      [Op.or]: [{ user_id: userId }, { user_id: null }],
    },
    raw: true,
  });
};

export default {
  findAccessibleById,
};

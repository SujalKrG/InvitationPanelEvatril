import guestService from "../services/guest.service.js";
import ApiError from "../utils/apiError.js";
import db from "../models/index.js";
import { Op } from "sequelize";

const { GuestDirectories, GuestGroups } = db;

export const addGuest = async (req, res) => {
  try {
    const user_id = req.user?.id || Number(req.body.user_id);
    let guests = req.body.guests || req.body;
    if (!Array.isArray(guests)) {
      guests = [guests];
    }

    if (!user_id || guests.length === 0) {
      return res
        .status(400)
        .json({ message: "user_id and at least one guest is required" });
    }

    // normalize
    const cleaned = guests.map((g) => ({
      user_id,
      group_id: g.group_id ? Number(g.group_id) : null,
      name: (g.name || "").trim(),
      country_code: (g.country_code || "").trim(),
      phone: String(g.phone || "").trim(),
    }));

    // validate
    for (const g of cleaned) {
      if (!g.name || !g.country_code || !g.phone) {
        return res
          .status(400)
          .json({ message: "Each guest must have name, country_code, phone" });
      }
      if (g.group_id) {
        const group = await GuestGroups.findOne({
          where: { id: g.group_id, [Op.or]: [{ user_id }, { user_id: null }] },
        });
        if (!group) {
          return res
            .status(400)
            .json({ message: `Invalid group_id ${g.group_id}` });
        }
      }
    }

    // process
    const results = [];
    for (const g of cleaned) {
      const exists = await GuestDirectories.findOne({
        where: { user_id, country_code: g.country_code, phone: g.phone },
      });
      if (exists) {
        results.push({
          status: "skipped",
          reason: "duplicate",
          guest: exists.name,
        });
      } else {
        const created = await GuestDirectories.create(g);
        results.push({ status: "created", guest: created });
      }
    }

    return res.status(201).json({ results });
  } catch (error) {
    console.error("addGuest error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getGuests = async (req, res) => {
  try {
    const userId = req.user?.id || Number(req.query.user_id);
    const payload = await guestService.getGuestsGrouped({ userId });
    return res.json(payload); // { groups: [...], unassigned: [...] }
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("getGuests error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editGuest = async (req, res) => {
  try {
    const userId = req.user?.id || Number(req.body.user_id);
    const guestId = Number(req.params.guestId);
    const payload = req.body;

    const updated = await guestService.editGuest({ userId, guestId, payload });
    return res.json({ message: "Guest updated", guest: updated });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("updateGuest error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const createGroup = async (req, res) => {
  try {
    const user_id = req.user?.id || Number(req.body.user_id);
    const name = (req.body.name || "").trim();

    if (!user_id || !name) {
      return res.status(400).json({ message: "user_id and name are required" });
    }

    //! ✅ Check global groups (user_id = null)
    const globalExists = await GuestGroups.findOne({
      where: {
        name,
        user_id: null,
      },
    });
    if (globalExists) {
      return res.status(400).json({
        message: `"${name}" is a default group. You cannot create it.`,
      });
    }

    //! ✅ Check if user already has a group with this name
    const userGroupExists = await GuestGroups.findOne({
      where: {
        name,
        user_id,
      },
    });
    if (userGroupExists) {
      return res
        .status(400)
        .json({ message: `You already created a group named "${name}".` });
    }

    //! ✅ Create new group
    const group = await GuestGroups.create({ user_id, name });
    return res.status(201).json({ message: "Group created", group });
  } catch (error) {
    console.error("createGroup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const editGroup = async (req, res) => {
  try {
    const user_id = req.user?.id || Number(req.body.user_id);
    const groupId = Number(req.params.id);
    const newName = (req.body.name || "").trim();
    // console.log(user_id, groupId, newName);

    if (!user_id || !groupId || !newName) {
      return res
        .status(400)
        .json({ message: "user_id, group id and new name are required" });
    }

    const group = await GuestGroups.findOne({ where: { id: groupId } });
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Rule 1 & 2: must be owner and cannot rename global groups
    if (group.user_id === null) {
      return res
        .status(403)
        .json({ message: "Cannot rename a default (global) group" });
    }
    if (group.user_id !== user_id) {
      return res
        .status(403)
        .json({ message: "Not allowed — you do not own this group" });
    }

    // Rule 3: new name must not already exist for this user
    const userConflict = await GuestGroups.findOne({
      where: {
        user_id,
        name: newName,
        id: { [Op.ne]: groupId }, // exclude current group
      },
      raw: true,
    });
    if (userConflict) {
      return res
        .status(400)
        .json({ message: `You already have a group named "${newName}"` });
    }

    // Rule 3 (continued): new name must not clash with any global group (user_id = null)
    const globalConflict = await GuestGroups.findOne({
      where: { user_id: null, name: newName },
      raw: true,
    });
    if (globalConflict) {
      return res.status(400).json({
        message: `"${newName}" is a default group name and cannot be used`,
      });
    }

    // All good — rename
    group.name = newName;
    await group.save();

    return res.json({ message: "Group renamed", group });
  } catch (error) {
    console.error("editGroup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

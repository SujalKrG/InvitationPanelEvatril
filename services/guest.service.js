import ApiError from "../utils/apiError.js";
import guestRepo from "../repositories/guest.repository.js";
import groupRepo from "../repositories/group.repository.js";

const trim = (v) => (typeof v === "string" ? v.trim() : v);

export const editGuest = async ({ userId, guestId, payload }) => {
  if (!userId) throw ApiError.unauthorized("Missing user");
  if (!guestId) throw ApiError.badRequest("Missing guestId");

  const guest = await guestRepo.findByIdAndUser(guestId, userId);
  if (!guest) throw ApiError.notFound("Guest not found");

  // prepare new values (keep existing when not provided)
  const newName = payload.name !== undefined ? trim(payload.name) : guest.name;
  const newCountry =
    payload.country_code !== undefined
      ? trim(payload.country_code)
      : guest.country_code;
  const newPhone =
    payload.phone !== undefined ? String(payload.phone).trim() : guest.phone;
  const newGroupId =
    payload.group_id !== undefined
      ? payload.group_id
        ? Number(payload.group_id)
        : null
      : guest.group_id;

  // validate required fields are not empty
  if (!newName || !newCountry || !newPhone) {
    throw ApiError.badRequest("name, country_code, and phone are required");
  }

  // if group provided -> validate accessibility (user group or default)
  if (payload.group_id !== undefined && newGroupId) {
    const group = await groupRepo.findAccessibleById(newGroupId, userId);
    if (!group) throw ApiError.badRequest("Invalid group_id");
  }

  // if phone/country changed -> check duplicate for same user (exclude current)
  if (newCountry !== guest.country_code || newPhone !== guest.phone) {
    const conflict = await guestRepo.findByUserCountryPhone(
      userId,
      newCountry,
      newPhone,
      guestId
    );
    if (conflict)
      throw ApiError.conflict("Another guest with this phone already exists");
  }

  // apply update
  const updated = await guestRepo.updateGuest(guest, {
    name: newName,
    country_code: newCountry,
    phone: newPhone,
    group_id: newGroupId,
  });

  return updated.get ? updated.get({ plain: true }) : updated; // return plain object
};

export const getGuestsGrouped = async ({ userId }) => {
  if (!userId) throw ApiError.unauthorized("Missing user");

  // groups (with guests included)
  const groupsRaw = await groupRepo.findGroupsWithGuestsForUser(userId);
  const groups = groupsRaw.map((g) => (g.get ? g.get({ plain: true }) : g));

  // unassigned guests
  const unassigned = await guestRepo.findUnassignedForUser(userId);

  return { groups, unassigned };
};

export default {
  editGuest,
  getGuestsGrouped,
};

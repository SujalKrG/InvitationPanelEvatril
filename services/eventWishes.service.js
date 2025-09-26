import db from "../models/index.js";
import sanitize from "../utils/sanitize.js";
import { getIo } from "../sockets/socket.singleton.js";
// console.log("DB models:", Object.keys(db));

const { EventWishes, EventConversations, GuestDirectories, sequelize } = db;

export async function listWishes(eventId, { limit = 10, offset = 0 } = {}) {
  // Returns latest wishes with included guest info and conversations
  const wishes = await EventWishes.findAll({
    where: { event_id: eventId },
    order: [["created_at", "DESC"]],
    limit,
    offset,
    include: [
      {
        model: EventConversations,
        as: "conversations",
      },
      {
        model: GuestDirectories,
        as: "guest",
        attributes: ["id", "name", "phone"],
        required: false,
      },
    ],
  });

  return wishes;
}

export async function createWish(eventId, { guest_id, message }) {
  // Basic validation at service level
  if (!guest_id) {
    const err = new Error("guest_id is required");
    err.status = 400;
    throw err;
  }

  if (!message || String(message).trim().length === 0) {
    const err = new Error("message is required");
    err.status = 400;
    throw err;
  }

  const cleanMsg = sanitize(message);

  const t = await sequelize.transaction();
  try {
    // Create the wish inside a transaction
    const wish = await EventWishes.create(
      {
        event_id: eventId,
        guest_id,
        message: cleanMsg,
      },
      { transaction: t }
    );

    // Eager load guest info (outside or inside transaction — here inside for consistency)
    const wishWithGuest = await EventWishes.findByPk(wish.id, {
      transaction: t,
      include: [
        {
          model: GuestDirectories,
          as: "guest",
          attributes: ["id", "name", "phone"],
          required: false,
        },
      ],
    });

    await t.commit();

    // Emit socket event (best-effort; do not fail the request if emit fails)
    try {
      const io = getIo();
      io.to(`event_${eventId}`).emit("new-wish", { wish: wishWithGuest });
    } catch (emitErr) {
      // Log and continue — DB write succeeded
      console.error(
        "Socket emit failed (new-wish):",
        emitErr.message || emitErr
      );
    }

    return wishWithGuest;
  } catch (error) {
    await t.rollback();
    // Normalise error shape
    if (!error.status) error.status = 500;
    throw error;
  }
}

export async function createConversation(
  eventId,
  wishId,
  { sender_type, message }
) {
  if (!sender_type) {
    const err = new Error("sender_type is required");
    err.status = 400;
    throw err;
  }

  if (!["Guest", "admin"].includes(sender_type)) {
    const err = new Error("sender_type must be 'Guest' or 'admin'");
    err.status = 400;
    throw err;
  }

  if (!message || String(message).trim().length === 0) {
    const err = new Error("message is required");
    err.status = 400;
    throw err;
  }

  const cleanMsg = sanitize(message);

  const t = await sequelize.transaction();
  try {
    const conversation = await EventConversations.create(
      {
        event_wish_id: wishId,
        sender_type,
        message: cleanMsg,
      },
      { transaction: t }
    );
    await t.commit();

    // Emit minimal payload so clients can append to UI
    try {
      const io = getIo();
      io.to(`event_${eventId}`).emit("new-conversation", {
        wishId,
        conversation,
      });
    } catch (emitErr) {
      console.error(
        "Socket emit failed (new-conversation):",
        emitErr.message || emitErr
      );
    }

    return conversation;
  } catch (error) {
    await t.rollback();
    if (!error.status) error.status = 500;
    throw error;
  }
}

import * as service from "../services/eventWishes.service.js";

export async function getWishes(req, res, next) {
  try {
    const { eventId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const wishes = await service.listWishes(eventId, {
      limit: Number(limit),
      offset: Number(offset),
    });
    return res.json({ wishes });
  } catch (error) {
    return next(error);
  }
}

export async function postWish(req, res, next) {
  try {
    const { eventId } = req.params;
    const payload = req.body;
    const wish = await service.createWish(eventId, payload);
    return res.status(201).json({ wish });
  } catch (error) {
    return next(error);
  }
}

export async function postConversation(req, res, next) {
  try {
    const { eventId, wishId } = req.params;
    const payload = req.body;
    const conversation = await service.createConversation(
      eventId,
      wishId,
      payload
    );
    return res.status(201).json({ conversation });
  } catch (err) {
    return next(err);
  }
}

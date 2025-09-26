import Joi from "joi";

export const createWishSchema = Joi.object({
  guest_id: Joi.number().required(),
  message: Joi.string().min(1).max(2000).required(),
});

export const createConversationSchema = Joi.object({
  sender_type: Joi.string().valid("Guest", "admin").required(),
  message: Joi.string().min(1).max(2000).required(),
});

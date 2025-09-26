import express from "express";
import * as ctrl from "../controllers/eventWishes.controller.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  createConversationSchema,
  createWishSchema,
} from "../validators/eventWishes.validator.js";

const router = express.Router();

router.get("/:eventId/wishes", ctrl.getWishes);
router.post(
  "/:eventId/wishes",
  validateRequest(createWishSchema),
  ctrl.postWish
);
router.post(
  "/:eventId/wishes/:wishId/conversations",
  validateRequest(createConversationSchema),
  ctrl.postConversation
);

export default router;

import express from "express";
import { authenticateUser } from "../middlewares/auth.js";
import {
  createEventTextOnly,
  getEventBySlug,
} from "../controllers/event.controller.js";
import { uploadPhotoToServer } from "../controllers/photo.controller.js";
import { uploadDisk } from "../middlewares/uploadDisk.js";

const router = express.Router();

router.post("/create-event", authenticateUser, createEventTextOnly);

router.get("/events/:slug", getEventBySlug);

router.post(
  "/events/:slug/photos/upload",
  authenticateUser,
  uploadDisk.any(),
  uploadPhotoToServer
);

export default router;

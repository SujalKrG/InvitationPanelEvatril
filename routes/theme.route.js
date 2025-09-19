import express from "express";
import { authenticateUser } from "../middlewares/auth.js";
import {
  getThemesBySlug,
  getThemeByThemeAndEventSlug,
} from "../controllers/theme.controller.js";

const router = express.Router();

// GET /themes/:occasionSlug?category=<category-slug>
router.get(
  "/themes/:occasionSlug/:eventSlug",
  authenticateUser,
  getThemesBySlug
);

router.get(
  "/themes/:themeSlug/:eventSlug/view",
  authenticateUser,
  getThemeByThemeAndEventSlug
);

export default router;

import express from "express";
import {
  getOccasions,
  getOccasionFieldsBySlug,
} from "../controllers/occasion.controller.js";

const router = express.Router();

router.get("/get-occasions", getOccasions);
router.get("/occasion-fields/:slug", getOccasionFieldsBySlug);

export default router;

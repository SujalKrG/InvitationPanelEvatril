import express from "express";

import { addGuest } from "../controllers/guest.controller.js";

const router = express.Router();

router.post("/guests", addGuest);

export default router;

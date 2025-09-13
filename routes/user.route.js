import express from "express";
import { authenticateUser } from "../middlewares/auth.js";
import { getEventsByUserId } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/users/events/get", authenticateUser, getEventsByUserId);

export default router;

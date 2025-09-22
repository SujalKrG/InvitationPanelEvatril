import express from "express";
import { authenticateUser } from "../middlewares/auth.js";
import {
  addGuest,
  getGuests,
  editGuest,
  createGroup,
  editGroup,
} from "../controllers/guest.controller.js";

const router = express.Router();

router.post("/guests/add", authenticateUser, addGuest);
router.patch("/guests/edit/:guestId", authenticateUser, editGuest);
router.post("/group/create", authenticateUser, createGroup);
router.patch("/group/edit/:id", authenticateUser, editGroup);
router.get("/guests/get", authenticateUser, getGuests);

export default router;

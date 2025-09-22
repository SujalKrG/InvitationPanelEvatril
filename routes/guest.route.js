import express from "express";
import { authenticateUser } from "../middlewares/auth.js";
import {
  addGuest,
  editGuest,
  createGroup,
  editGroup,
} from "../controllers/guest.controller.js";

const router = express.Router();

router.post("/guest/add", authenticateUser, addGuest);
router.patch("/guest/edit/:guestId", authenticateUser, editGuest);
router.post("/group/create", authenticateUser, createGroup);
router.patch("/group/edit/:id", authenticateUser, editGroup);

export default router;

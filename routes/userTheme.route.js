import { Router } from "express";
import {
  uploadUserTheme,
  updateUserTheme,
  getUserThemes,
} from "../controllers/userTheme.controller.js";
import { createMulter } from "../middlewares/multerFactory.js";
import { ensureDetectedMimeAllowed } from "../utils/validateFileSignature.js";
import { authenticateUser } from "../middlewares/auth.js";

const router = Router();

// Allow only jpeg, pdf, gif, mp4
const upload = createMulter([
  "image/jpeg",
  "application/pdf",
  "image/gif",
  "video/mp4",
]);

// CREATE (upload new theme)
router.post(
  "/user-themes/create",
  authenticateUser,
  upload.single("file"),
  ensureDetectedMimeAllowed(
    new Set(["image/jpeg", "application/pdf", "image/gif", "video/mp4"])
  ),
  uploadUserTheme
);

// UPDATE (replace + update extra_data)
router.patch(
  "/user-themes/:id/edit",
  authenticateUser,
  upload.single("file"),
  ensureDetectedMimeAllowed(
    new Set(["image/jpeg", "application/pdf", "image/gif", "video/mp4"])
  ),
  updateUserTheme
);

router.get("/user-themes/get", authenticateUser, getUserThemes);

export default router;

import { error } from "console";
import * as userThemeService from "../services/userTheme.service.js";

export const uploadUserTheme = async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log(userId);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Multer attaches the uploaded file to req.file
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Request body
    const { extraData, eventSlug, themeSlug, occasionSlug } = req.body;

    // Call service
    const { row, jobId } = await userThemeService.createAndQueueUserTheme({
      userId,
      filePath: file.path,
      originalName: file.originalname,
      mimeType: file.detectedMime || file.mimetype,
      extraData: extraData ? JSON.parse(extraData) : {},
      eventSlug: eventSlug || null,
      themeSlug: themeSlug || null,
      occasionSlug: occasionSlug || null,
    });

    return res.status(202).json({
      message: "User theme upload queued",
      userThemeId: row.id,
      jobId,
    });
  } catch (error) {
    console.error("uploadUserTheme error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserTheme = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const userThemeId = req.params.id;
    if (!req.file) {
      return res.status(400).json({ message: "File is required for update" });
    }
    if (!req.body.extra_data) {
      return res.status(400).json({ message: "extra_data is required" });
    }

    const newFile = {
      path: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.detectedMime || req.file.mimetype,
    };

    const extraData = JSON.parse(req.body.extra_data);

    const result = await userThemeService.updateUserTheme({
      userThemeId,
      userId,
      extraData,
      newFile,
    });

    return res.json(result);
  } catch (error) {
    console.error("updateUserTheme error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserThemes = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const themes = await userThemeService.getUserThemes(userId);
    return res.json(themes);
  } catch (error) {
    console.error("getUserThemes error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Internal server error" });
  }
};

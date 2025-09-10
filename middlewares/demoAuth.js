// src/middlewares/demoAuth.js

import dotenv from "dotenv";
dotenv.config();
export const demoAuth = (req, res, next) => {
  if (process.env.DEV_AUTH_BYPASS !== "1") {
    return res.status(401).json({ message: "DEV_AUTH_BYPASS not enabled" });
  }

  const demoId = req.header("x-demo-user-id") || req.header("x-user-id");
  if (!demoId) {
    return res
      .status(401)
      .json({ message: "Missing x-demo-user-id header (dev only)" });
  }

  req.user = { id: demoId };
  next();
};

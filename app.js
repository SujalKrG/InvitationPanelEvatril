import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import occasionRoutes from "./routes/occasion.route.js";
import eventRoutes from "./routes/event.route.js";
import userRoutes from "./routes/user.route.js";
import themeRoutes from "./routes/theme.route.js";
import guestRoutes from "./routes/guest.route.js";
import { verifyS3Connection } from "./utils/s3.js";
import db from "./models/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/api/v1", userRoutes);
app.use("/api/v1", occasionRoutes);
app.use("/api/v1", eventRoutes);
app.use("/api/v1", themeRoutes);
app.use("/api/v1", guestRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function startServer() {
  try {
    // ✅ test DB connection before starting
    await db.sequelize.authenticate();
    console.log("✅ Primary DB connection established.");

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      verifyS3Connection();
    });
  } catch (err) {
    console.error(
      "❌ Unable to connect to the primary DB:",
      err.message || err
    );
    process.exit(1); // exit so you notice during testing
  }
}

startServer();

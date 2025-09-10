import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import occasionRoutes from "./routes/occasion.route.js";
import eventRoutes from "./routes/event.route.js";
import { verifyS3Connection } from "./utils/s3.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/api/v1", occasionRoutes);
app.use("/api/v1", eventRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  verifyS3Connection();
});

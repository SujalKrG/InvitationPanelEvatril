import db from "../models/index.js";
import { getEventTitle, generateEventSlug } from "../utils/eventUtils.js";

const { Event, Occasion } = db;

// export const createEvent = async (req, res) => {
//   try {
//     //check for logged in user
//     const userId = req.user?.id;
//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const {
//       occasion_id,
//       event_datetime,
//       venue_name,
//       venue_address,
//       ...dynamicFields
//     } = req.body;

//     if (!occasion_id || !event_datetime) {
//       return res
//         .status(400)
//         .json({ message: "occasion_id and event_datetime are required" });
//     }

//     // Fetch occasion from remote DB
//     const occasion = await Occasion.findOne({
//       where: { id: occasion_id, invitation_status: true },
//       attributes: ["id", "slug"],
//     });
//     if (!occasion) {
//       return res.status(404).json({ message: "Occasion not found" });
//     }

//     let occasion_data = { ...dynamicFields };

//     const handleUpload = async (file, prefix) => {
//       if (!file) return null;
//       const safeName = file.originalname.replace(/\s+/g, "-");
//       const compressed = await sharp(file.buffer)
//         .jpeg({ quality: 70 })
//         .toBuffer();
//       return await uploadToS3(
//         compressed,
//         `${prefix}-${nanoid(6)}-${safeName}`,
//         file.mimetype,
//         "events"
//       );
//     };

//     if (occasion.slug.includes("wedding")) {
//       occasion_data.bride_photo = await handleUpload(
//         req.files?.bride_photo?.[0],
//         "bride"
//       );
//       occasion_data.groom_photo = await handleUpload(
//         req.files?.groom_photo?.[0],
//         "groom"
//       );
//     } else if (occasion.slug.includes("anniversary")) {
//       occasion_data.photo1 = await handleUpload(
//         req.files?.photo1?.[0],
//         "photo1"
//       );
//       occasion_data.photo2 = await handleUpload(
//         req.files?.photo2?.[0],
//         "photo2"
//       );
//     } else {
//       occasion_data.photo = await handleUpload(req.files?.photo?.[0], "photo");
//     }

//     const title = getEventTitle(occasion.slug, occasion_data || {});
//     const slug = generateEventSlug(title);

//     const newEvent = await Event.create({
//       user_id: userId,
//       occasion_id,
//       event_datetime,
//       venue_name,
//       venue_address,
//       occasion_data,
//       title,
//       slug,
//     });
//     res
//       .status(201)
//       .json({ message: "Event created successfully", event: newEvent });
//   } catch (error) {
//     console.error("Error creating event:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// canonical empty photo node
const photoNode = (overrides = {}) => ({
  status: "idle",
  original_path: null,
  original_key: null,
  previous_key: null,
  processed_key: null,
  url: null,
  job_id: null,
  error: null,
  ...overrides,
});

export const createEventTextOnly = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      occasion_id,
      event_datetime,
      venue_name,
      venue_address,
      ...dynamicFields
    } = req.body;
    // console.log("Incoming body:", req.body);

    if (!occasion_id || !event_datetime) {
      return res
        .status(400)
        .json({ message: "occasion_id and event_datetime are required" });
    }

    const occasion = await Occasion.findOne({
      where: { id: occasion_id, invitation_status: true },
      attributes: ["id", "slug"],
    });
    if (!occasion)
      return res.status(404).json({ message: "Occasion not found" });

    const occasionSlug = String(occasion.slug || "").toLowerCase();

    // map occasion -> expected photo keys (make this map-driven if you prefer)
    let expectedPhotoKeys = [];
    if (occasionSlug.includes("wedding"))
      expectedPhotoKeys = ["bride_photo", "groom_photo"];
    else if (occasionSlug.includes("anniversary"))
      expectedPhotoKeys = ["photo1", "photo2"];
    else if (occasionSlug.includes("engagement"))
      expectedPhotoKeys = ["bride_to_be_photo", "groom_to_be_photo"];
    else expectedPhotoKeys = ["photo"];

    const preservedData = { ...dynamicFields };

    // Remove any keys that match expectedPhotoKeys from preservedData
    for (const k of expectedPhotoKeys) {
      if (k in preservedData) delete preservedData[k];
    }

    const occasion_data = {
      ...preservedData,
    };

    for (const key of expectedPhotoKeys) {
      const incoming = dynamicFields[key];

      // Accept a client-provided URL string (optional) by wrapping it into node
      if (incoming && typeof incoming === "string") {
        occasion_data[key] = photoNode({ url: incoming, status: "ready" });
      } else {
        occasion_data[key] = photoNode();
      }
    }

    const title = getEventTitle(occasion.slug, occasion_data || {});
    const eventSlug = generateEventSlug(title);

    const newEvent = await Event.create({
      user_id: userId,
      occasion_id,
      event_datetime,
      venue_name,
      venue_address,
      occasion_data,
      title,
      slug: eventSlug,
    });

    return res.status(201).json({
      message: "Event created (text only). Proceed to photo step.",
      event: newEvent,
    });
  } catch (error) {
    console.error("Error creating event (text-only):", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getEventBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const event = await Event.findOne({ where: { slug } });
    if (!event) return res.status(404).json({ message: "Not found" });
    return res.json(event);
  } catch (err) {
    console.error("getEventBySlug error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

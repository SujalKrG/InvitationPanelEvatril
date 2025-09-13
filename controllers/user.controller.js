import db from "../models/index.js";
import OccasionResource from "../utils/occasionResource.js";

const { Event, Occasion } = db;

export const getEventsByUserId = async (req, res) => {
  try {
    // Prefer auth-derived user id, then header 'x-user-id'
    const headerUserId = req.headers["x-user-id"] || req.headers["X-User-Id"];
    const authUserId = req.user?.id;
    const userId = authUserId ?? (headerUserId ? Number(headerUserId) : null);
    console.log(
      "[EVENTS] hit getEventsByUserId, headers:",
      req.headers,
      "req.user:",
      req.user?.id
    );
    if (!userId || Number.isNaN(Number(userId))) {
      return res
        .status(400)
        .json({ message: "Missing or invalid user id in headers" });
    }

    //fetch all events
    const events = await Event.findAll({
      where: { user_id: userId },
      order: [["event_datetime", "ASC"]],
    });
    if (!events || events.length === 0) {
      return res.json({
        count: 0,
        events: [],
      });
    }

    //Collect unique occasion ids and load occasions in one query
    const occasionIds = [
      ...new Set(
        events
          .map((e) => (e.occasion_id ? Number(e.occasion_id) : null))
          .filter(Boolean)
      ),
    ];

    const occasions = await Occasion.findAll({
      where: { id: occasionIds },
      attributes: ["id", "name", "image"],
    });

    // 5) Map occasions by id for quick lookup
    const occasionMap = occasions.reduce((acc, occ) => {
      acc[occ.id] = {
        id: occ.id,
        name: OccasionResource.cleanString(occ.name), // ✅ use the cleaner here
        image: occ.image,
      };
      return acc;
    }, {});

    function getEventStatus(eventDateTime) {
      const eventDate = new Date(eventDateTime);

      const now = new Date();
      const startToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0
      );
      const endToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );

      if (eventDate >= startToday && eventDate <= endToday) {
        return "today";
      } else if (eventDate > endToday) {
        return "upcoming";
      } else {
        return "completed";
      }
    }

    // 6) Attach occasion object into each event's JSON
    const eventsWithOccasion = events.map((ev) => {
      const evJson = ev.toJSON();
      evJson.occasion = occasionMap[evJson.occasion_id] || null;
      evJson.status = getEventStatus(evJson.event_datetime);
      return evJson;
    });

    // 7) Send response with count and user meta
    return res.json({
      eventCount: eventsWithOccasion.length,
      events: eventsWithOccasion,
    });
  } catch (error) {
    console.error("getUserEvents error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

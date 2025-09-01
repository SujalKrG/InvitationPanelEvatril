import db from "./models/index.js";

const { sequelize, remoteSequelize, Event, User, Occasion, OccasionField } = db;

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Local DB connected");

    await remoteSequelize.authenticate();
    console.log("✅ Remote DB connected");

    console.log("Loaded models:", Object.keys(db));

    const event = await Event.findOne();
    console.log("Sample Event:", event ? event.toJSON() : "No events found");

    const user = await User.findOne();
    console.log("Sample User:", user ? user.toJSON() : "No users found");

    const occasion = await Occasion.findOne();
    console.log(
      "Sample Occasion:",
      occasion ? occasion.toJSON() : "No occasions found"
    );

    const field = await OccasionField.findOne();
    console.log(
      "Sample OccasionField:",
      field ? field.toJSON() : "No fields found"
    );
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await sequelize.close();
    await remoteSequelize.close();
  }
})();

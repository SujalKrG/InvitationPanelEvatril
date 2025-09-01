import db from "../models/index.js";
import OccasionResource from "../utils/occasionResource.js";

const { OccasionField, Occasion } = db;

// ✅ GET /api/v1/get-occasions
export const getOccasions = async (req, res, next) => {
  try {
    const occasions = await Occasion.findAll({
      where: { invitation_status: true },
    });

    res.json(OccasionResource.collection(occasions));
  } catch (error) {
    console.error("Error fetching occasions:", error);
    next(error);
  }
};

// ✅ GET /api/v1/occasion-fields/:slug
export const getOccasionFieldsBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        message: "Invalid request: Slug parameter is required",
      });
    }

    // Fetch from remote occasions
    const occasion = await Occasion.findOne({
      where: { slug, invitation_status: true },
    });

    if (!occasion) {
      return res.status(404).json({ message: "No occasion found" });
    }

    const normalizedOccasion = new OccasionResource(occasion);

    // Fetch fields from local occasion_fields
    const occasionFields = await OccasionField.findAll({
      where: { occasion_id: occasion.id },
    });

    if (!occasionFields || occasionFields.length === 0) {
      return res.status(404).json({ message: "No occasion fields found" });
    }

    const response = {
      ...normalizedOccasion,
      formFields: occasionFields.map((f) => ({
        formFieldId: f.id,
        fieldKey: f.field_key,
        label: f.label,
        type: f.type,
        required: f.required,
        options: f.options,
        orderNo: f.order_no,
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Get Occasion Fields Error:", error);
    next(error);
  }
};

import db from "../models/index.js";
const { sequelize, UserTheme, Theme, ThemeCategory, Event, Occasion } = db;

export const createUserThemeRow = async ({
  user_id,
  event_id = null,
  theme_id = null,
  occasion_id = null,
  purchased_price = 0.0,
  extra_data = {},
}) => {
  return UserTheme.create({
    user_id,
    event_id,
    theme_id,
    occasion_id,
    purchased_price,
    extra_data,
    file_url: "",
  });
};

export const findById = async (id) => {
  if (!id) return null;
  return UserTheme.findByPk(id);
};

export const findByIdRaw = async (id) => {
  if (!id) return null;
  const [rows] = await sequelize.query(
    `SELECT * FROM user_themes WHERE id = :id LIMIT 1`,
    {
      replacements: { id },
    }
  );
  return rows && rows[0] ? rows[0] : null;
};

export const findByIdWithRelations = async (id) => {
  if (!id) return null;
  return UserTheme.findOne({
    where: { id },
    include: [
      {
        model: Theme,
        as: "theme",
        include: [
          {
            model: ThemeCategory,
            as: "themeCategory",
            attributes: ["id", "name", "slug", "type"],
          },
        ],
        attributes: [
          "id",
          "name",
          "slug",
          "category_id",
          "occasion_id",
          "base_price",
          "offer_price",
          "currency",
        ],
      },
      {
        model: Event,
        as: "event",
        attributes: ["id", "slug", "user_id", "occasion_id"],
      },
    ],
  });
};

export const getUploadMeta = async (id) => {
  const [rows] = await sequelize.query(
    `SELECT
       JSON_UNQUOTE(JSON_EXTRACT(COALESCE(upload_meta, JSON_OBJECT()), '$.processed_key')) AS processed_key,
       JSON_UNQUOTE(JSON_EXTRACT(COALESCE(upload_meta, JSON_OBJECT()), '$.job_id')) AS job_id,
       JSON_UNQUOTE(JSON_EXTRACT(COALESCE(upload_meta, JSON_OBJECT()), '$.s3_folder')) AS s3_folder,
       JSON_UNQUOTE(JSON_EXTRACT(COALESCE(upload_meta, JSON_OBJECT()), '$.status')) AS status,
       JSON_UNQUOTE(JSON_EXTRACT(COALESCE(upload_meta, JSON_OBJECT()), '$.error')) AS error
     FROM user_themes WHERE id = :id LIMIT 1`,
    { replacements: { id } }
  );
  return rows && rows[0] ? rows[0] : null;
};

export const getPreviousProcessedKey = async (id) => {
  const meta = await getUploadMeta(id);
  const prev = meta ? meta.processed_key : null;
  if (!prev) return null;
  if (String(prev).trim().toLowerCase() === "null") return null;
  return prev;
};

export const mergeUploadMeta = async (id, fields = {}) => {
  const keys = Object.keys(fields || {});
  if (!keys.length) return;
  // build JSON_SET params dynamically
  const parts = [];
  const replacements = { id };
  keys.forEach((k, i) => {
    const param = `:v${i}`;
    // JSON path must be quoted without dots: $.key
    parts.push(`'$.${k}', ${param}`);
    replacements[`v${i}`] = fields[k] === undefined ? null : fields[k];
  });
  const sql = `UPDATE user_themes SET upload_meta = JSON_SET(COALESCE(upload_meta, JSON_OBJECT()), ${parts.join(
    ", "
  )}) WHERE id = :id`;
  return sequelize.query(sql, { replacements });
};

export const setJobId = async (id, jobId) =>
  mergeUploadMeta(id, { job_id: String(jobId) });

export const setUploadSuccess = async (id, processedKey, fileUrl, s3Folder) => {
  return sequelize.query(
    `UPDATE user_themes
     SET file_url = :fileUrl,
         upload_meta = JSON_SET(
           COALESCE(upload_meta, JSON_OBJECT()),
           '$.processed_key', :pkey,
           '$.s3_folder', :folder,
           '$.status', 'ready',
           '$.error', NULL
         )
     WHERE id = :id`,
    {
      replacements: {
        id,
        pkey: String(processedKey),
        fileUrl: String(fileUrl),
        folder: s3Folder || null,
      },
    }
  );
};

export const setUploadFailure = async (id, errMsg) => {
  const msg = errMsg ? String(errMsg).slice(0, 400) : null;
  return mergeUploadMeta(id, { status: "failed", error: msg });
};

export const updateFileUrlOnly = async (id, fileUrl) => {
  return UserTheme.update({ file_url: String(fileUrl) }, { where: { id } });
};

export const listByUser = async (userId, opts = {}) => {
  const limit = opts.limit || 50;
  const offset = opts.offset || 0;
  return UserTheme.findAll({
    where: { user_id: userId },
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });
};

export const findByEventId = async (eventId) => {
  if (!eventId) return [];
  return UserTheme.findAll({ where: { event_id: eventId } });
};

export const updateFileUrlAndMeta = async (id, fileUrl, meta = {}) => {
  // normalize incoming meta
  const {
    processed_key: processedKey,
    status,
    s3_folder: s3Folder,
  } = meta || {};

  // common success path: use existing setUploadSuccess helper
  if (status === "ready") {
    return setUploadSuccess(
      id,
      processedKey ?? null,
      fileUrl ?? null,
      s3Folder ?? null
    );
  }

  // otherwise update file_url if provided
  if (fileUrl) {
    await updateFileUrlOnly(id, fileUrl);
  }

  // prepare meta for merging (remove undefined values)
  const metaToMerge = { ...meta };
  Object.keys(metaToMerge).forEach((k) => {
    if (metaToMerge[k] === undefined) delete metaToMerge[k];
  });

  if (Object.keys(metaToMerge).length) {
    await mergeUploadMeta(id, metaToMerge);
  }

  return;
};

export const updateUserTheme = async (id, fields = {}) => {
  if (!id) throw new Error("updateUserTheme: id is required");

  // whitelist fields the API may update immediately
  const allowed = ["extra_data"]; // you can add other safe fields here later
  const payload = {};

  Object.keys(fields || {}).forEach((k) => {
    if (allowed.includes(k)) payload[k] = fields[k];
  });

  if (!Object.keys(payload).length) return null;

  await UserTheme.update(payload, { where: { id } });

  // return fresh row
  return findById(id);
};

export const listUserThemes = async (userId) => {
  return UserTheme.findAll({
    where: { user_id: userId },
    include: [
      {
        model: db.Event,
        as: "event",
        attributes: ["occasion_id", "title", "event_datetime"],
      },
    ],
    attributes: ["id", "file_url"],
    order: [["created_at", "DESC"]],
  });
};

export default {
  createUserThemeRow,
  findById,
  findByIdRaw,
  findByIdWithRelations,
  getUploadMeta,
  getPreviousProcessedKey,
  mergeUploadMeta,
  setJobId,
  setUploadSuccess,
  setUploadFailure,
  updateFileUrlOnly,
  listByUser,
  findByEventId,
  updateFileUrlAndMeta,
  updateUserTheme,
  listUserThemes,
};

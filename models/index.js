// models/index.js
import fs from "fs";
import path from "path";
import Sequelize from "sequelize";
import process from "process";
import { fileURLToPath, pathToFileURL } from "url";
import configFile from "../config/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basename = path.basename(__filename);

// default to production / primary
const env = process.env.NODE_ENV || "production";

// Select primary config: prefer explicit 'primary' block, fall back to production
const primaryConfig =
  configFile.primary ?? configFile.production ?? configFile[env];
if (!primaryConfig) {
  throw new Error(
    "No primary DB config found in config.js (expected config.primary or config.production)."
  );
}

// Build primary Sequelize instance
const primarySequelize = primaryConfig.use_env_variable
  ? new Sequelize(process.env[primaryConfig.use_env_variable], primaryConfig)
  : new Sequelize(
      primaryConfig.database,
      primaryConfig.username,
      primaryConfig.password,
      primaryConfig
    );

// Remote DB connection
const remoteConfig = configFile.remote;
if (!remoteConfig) {
  throw new Error(
    "No remote DB config found in config.js (expected config.remote)."
  );
}
const remoteSequelize = remoteConfig.use_env_variable
  ? new Sequelize(process.env[remoteConfig.use_env_variable], remoteConfig)
  : new Sequelize(
      remoteConfig.database,
      remoteConfig.username,
      remoteConfig.password,
      remoteConfig
    );

const db = {};

// helper for safe dynamic import
async function safeImportModel(filePath) {
  try {
    const mod = await import(filePath);
    return mod.default ?? mod;
  } catch (err) {
    console.error(`Failed to import model ${filePath}:`, err);
    throw err;
  }
}

// Load primary models
for (const file of fs.readdirSync(__dirname)) {
  if (
    file.indexOf(".") !== 0 &&
    file !== basename &&
    file.slice(-3) === ".js" &&
    file.indexOf(".test.js") === -1
  ) {
    const modelPath = pathToFileURL(path.join(__dirname, file)).href;
    const modelDef = await safeImportModel(modelPath);
    const model = modelDef(primarySequelize, Sequelize.DataTypes);
    if (!model || !model.name) {
      console.warn(
        `Model from ${file} did not return a valid model definition.`
      );
      continue;
    }
    db[model.name] = model;
  }
}

// Load remote models into a separate namespace to avoid collisions
const remoteModelsDir = path.join(__dirname, "remote");
db.remote = db.remote || {}; // namespace for remote models
if (fs.existsSync(remoteModelsDir)) {
  for (const file of fs.readdirSync(remoteModelsDir)) {
    if (file.slice(-3) === ".js") {
      const remoteModelPath = pathToFileURL(
        path.join(remoteModelsDir, file)
      ).href;
      const modelDef = await safeImportModel(remoteModelPath);
      const model = modelDef(remoteSequelize, Sequelize.DataTypes);
      if (!model || !model.name) {
        console.warn(
          `Remote model from ${file} did not return a valid model definition.`
        );
        continue;
      }
      // put remote models under db.remote.<ModelName>
      db.remote[model.name] = model;
    }
  }
}

// --- COPY REMOTE MODELS INTO ROOT NAMESPACE (preserve backward compatibility) ---
for (const name of Object.keys(db.remote || {})) {
  if (!db[name]) {
    // if primary doesn't have the model, expose the remote model at db.<Name>
    db[name] = db.remote[name];
  } else {
    // if a primary model with same name exists, expose remote as <Name>_remote
    db[`${name}_remote`] = db.remote[name];
  }
}
// --- end copy snippet ---

// Run associations. Models can access remote models via db.remote if needed.
Object.keys(db)
  .filter((k) => k !== "remote")
  .forEach((modelName) => {
    if (db[modelName].associate) {
      db[modelName].associate(db);
    }
  });

// Also run remote model associations (if they have cross-associations, handle accordingly)
Object.keys(db.remote || {}).forEach((modelName) => {
  if (db.remote[modelName].associate) {
    db.remote[modelName].associate({ ...db, remote: db.remote });
  }
});

// Export instances and compatibility aliases
db.primarySequelize = primarySequelize;
db.remoteSequelize = remoteSequelize;
db.sequelize = primarySequelize; // legacy alias
db.Sequelize = Sequelize;

export default db;

import fs from "fs";
import path from "path";
import Sequelize from "sequelize";
import process from "process";
import { fileURLToPath, pathToFileURL } from "url"; // ✅ added pathToFileURL
import configFile from "../config/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = configFile[env];
const db = {};

// Local DB connection
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// Remote DB connection
const remoteConfig = configFile.remote;
let remoteSequelize = new Sequelize(
  remoteConfig.database,
  remoteConfig.username,
  remoteConfig.password,
  remoteConfig
);

// Load local models
for (const file of fs.readdirSync(__dirname)) {
  if (
    file.indexOf(".") !== 0 &&
    file !== basename &&
    file.slice(-3) === ".js" &&
    file.indexOf(".test.js") === -1
  ) {
    const modelPath = pathToFileURL(path.join(__dirname, file)).href; // ✅ convert to file://
    const { default: modelDef } = await import(modelPath);
    const model = modelDef(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  }
}

// Load remote models
for (const file of fs.readdirSync(path.join(__dirname, "remote"))) {
  if (file.slice(-3) === ".js") {
    const remoteModelPath = pathToFileURL(
      path.join(__dirname, "remote", file)
    ).href; // ✅ convert to file://
    const { default: modelDef } = await import(remoteModelPath);
    const model = modelDef(remoteSequelize, Sequelize.DataTypes);
    db[model.name] = model;
  }
}

// Run associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.remoteSequelize = remoteSequelize;
db.Sequelize = Sequelize;

export default db;

import dotenv from "dotenv";
dotenv.config();

export default {
  development: {
    username: process.env.PRIMARY_DB_USER,
    password: process.env.PRIMARY_DB_PASS,
    database: process.env.PRIMARY_DB_NAME,
    host: process.env.PRIMARY_DB_HOST,
    port: process.env.PRIMARY_DB_PORT,
    dialect: "mysql",
  },
  test: {
    username: process.env.PRIMARY_DB_USER,
    password: process.env.PRIMARY_DB_PASS,
    database: process.env.PRIMARY_DB_NAME,
    host: process.env.PRIMARY_DB_HOST,
    port: process.env.PRIMARY_DB_PORT,
    dialect: "mysql",
  },
  production: {
    username: process.env.PRIMARY_DB_USER,
    password: process.env.PRIMARY_DB_PASS,
    database: process.env.PRIMARY_DB_NAME,
    host: process.env.PRIMARY_DB_HOST,
    port: process.env.PRIMARY_DB_PORT,
    dialect: "mysql",
  },
  primary: {
    username: process.env.PRIMARY_DB_USER,
    password: process.env.PRIMARY_DB_PASS,
    database: process.env.PRIMARY_DB_NAME,
    host: process.env.PRIMARY_DB_HOST,
    port: process.env.PRIMARY_DB_PORT,
    dialect: "mysql",
  },

  remote: {
    username: process.env.DB2_USERNAME,
    password: process.env.DB2_PASSWORD,
    database: process.env.DB2_DATABASE,
    host: process.env.DB2_HOST,
    dialect: "mysql",
  },
};

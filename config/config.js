const fs = require("fs");

module.exports = {
  production: {
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DB_NAME,
    database_url: process.env.DATABASE_URL,
    dialect: "postgres",
  },
};

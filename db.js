const Sequelize = require("sequelize");
const { DataTypes } = require("sequelize"); //leave for later

//create Sequelize instance and connect to only-pets db table

const sequelize = new Sequelize("straight-up-bourbon", "postgres", "password", {
  host: "localhost",
  dialect: "postgres",
});

//Uncomment below when deploying to heroku
// const sequelize = new Sequelize(process.env.DATABASE_URL, {
//   dialect: "postgres",
//   protocol: "postgres",
//   dialectOptions: {
//     ssl: { require: true, rejectUnauthorized: false },
//     keepAlive: true,
//   },
//   ssl: true,
// });

//authenticate() sequelize
sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully");
  })
  .catch((err) => {
    console.error("Unable to connect to the database", err);
  });

//init db as an empty object to store all db related models/objects/functions
const db = {};

//main instances
db.Sequelize = Sequelize;
db.sequelize = sequelize;

//models
db.user = sequelize.import("./models/user");
db.product = sequelize.import("./models/product/product");
db.stock = sequelize.import("./models/product/product-stock");
db.descriptions = sequelize.import("./models/product/product-descriptions");

//Define through tables for associations later

//associations
//For a better understanding of relationships go to:
//https://database.guide/the-3-types-of-relationships-in-database-design/
const createAssoc = async () => {
  await db.product.hasMany(db.stock);
  await db.stock.belongsTo(db.product);

  await db.product.hasMany(db.descriptions);
  await db.descriptions.belongsTo(db.product);
};

//add createAssoc function to db object
db.createAssoc = createAssoc;

//sync tables in order to make sure associations do not fail
const syncDB = async () => {
  //tables
  await db.user.sync();
  await db.product.sync();
  await db.stock.sync();
  await db.descriptions.sync();

  //the rest of the table
  await db.sequelize.sync();
};

//add syncDB function to db object
db.sync = syncDB;

module.exports = db;

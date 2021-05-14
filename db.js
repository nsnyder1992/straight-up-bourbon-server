const Sequelize = require("sequelize");
const { DataTypes } = require("sequelize"); //leave for later
const os = require("os");

//create Sequelize instance and connect to straight-up-bourbon db table
//if equal to dev computer connect locally if not connect to cloud
const hostname = os.hostname();
console.log("HOSTNAME: " + os.hostname());
let sequelize;
if (hostname == "DESKTOP-LH98VU6" || hostname == "DESKTOP-5RPO176") {
  sequelize = new Sequelize("straight-up-bourbon", "postgres", "password", {
    host: "localhost",
    dialect: "postgres",
  });
} else {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
      keepAlive: true,
    },
    ssl: true,
  });
}

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
db.orders = sequelize.import("./models/order/orders");

//Define through tables for M-N associations later
db.customerOrders = sequelize.define("customer_orders", {
  //users have orders
  orderId: {
    type: DataTypes.INTEGER,
    references: {
      model: db.orders,
      key: "id",
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: db.user,
      key: "id",
    },
  },
});

//associations
//For a better understanding of relationships go to:
//https://database.guide/the-3-types-of-relationships-in-database-design/
const createAssoc = async () => {
  //product has stock
  await db.product.hasMany(db.stock);
  await db.stock.belongsTo(db.product);

  //product has descriptions
  await db.product.hasMany(db.descriptions);
  await db.descriptions.belongsTo(db.product);

  //users have orders
  await db.user.belongsToMany(db.orders, { through: db.customerOrders });
  await db.orders.belongsToMany(db.user, { through: db.customerOrders });
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
  await db.orders.sync();
  await db.customerOrders.sync();

  //the rest of the table
  await db.sequelize.sync();
};

//add syncDB function to db object
db.sync = syncDB;

module.exports = db;

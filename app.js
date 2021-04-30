//environment
require("dotenv").config();

//create an app
const express = require("express");
const app = express();

//database
const db = require("./db");
db.createAssoc(); //create associations
db.sync(); //sync each table in order

//controllers
const user = require("./controllers/users/user-controller");
const product = require("./controllers/products/product-controller");
const stock = require("./controllers/products/stock-controller");
const description = require("./controllers/products/description-controller");
const order = require("./controllers/orders/order-controller");
const customerOrders = require("./controllers/orders/customer-orders-controller");
const tracking = require("./controllers/orders/tracking-controller");

//aux controllers
const youtube = require("./controllers/youtube-controller");
const checkout = require("./controllers/checkout-controller");
const cloudinary = require("./controllers/cloudinary-controller");

//headers
app.use(require("./middleware/headers"));

//app options
app.options("*", (req, res) => {
  //allows localhost cross-origin on chrome
  res.json({
    status: "OK",
  });
});

////////////////////////////////////////////////
//Exposed Routes (NOT JSON)
////////////////////////////////////////////////

//use json (enable to get req.body)
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

////////////////////////////////////////////////
//Exposed Routes
////////////////////////////////////////////////
app.use("/youtube", youtube);
app.use("/checkout", checkout);
app.use("/user", user);
app.use("/product", product);
app.use("/track", tracking);

////////////////////////////////////////////////
//User Protected Routes
////////////////////////////////////////////////
app.use(require("./middleware/validate-session"));
app.use("/product/stock", stock);
app.use("/product/description", description);
app.use("/cloudinary", cloudinary);
app.use("/order", order);
app.use("/customer/order", customerOrders);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`App is listening on port ${PORT}`);
});

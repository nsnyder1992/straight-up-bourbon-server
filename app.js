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

//use json (enable to get res.body)
app.use(express.json());

////////////////////////////////////////////////
//Exposed Routes
////////////////////////////////////////////////
app.use("/user", user);

////////////////////////////////////////////////
//User Protected Routes
////////////////////////////////////////////////
app.use(require("./middleware/validate-session"));
app.use("/product", product);
app.use("/cloudinary", cloudinary);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`App is listening on port ${PORT}`);
});

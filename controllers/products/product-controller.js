require("dotenv");
const router = require("express").Router();
const Product = require("../../db").product;

//is admin?
const validateSessionAdmin = require("../../middleware/validate-session-admin");

////////////////////////////////////////////////
// CREATE PRODUCT
////////////////////////////////////////////////
router.post("/create", validateSessionAdmin, async (req, res) => {
  const product = await Product.create({
    name: req.body.name,
    type: req.body.type,
    color: req.body.color,
    description_main: req.body.description_main,
    cost: Math.floor(req.body.cost * 100) / 100,
  }).catch((err) => {
    console.log(err);
    res.status(500).json({ error: err });
  });

  for (image in req.body.images) {
    console.log(image);
  }

  for (point in req.body.description_points) {
    console.log(point);
  }

  for (size in req.body.sizes) {
    console.log(sizes);
  }

  for (key in Object.keys(req.body.stock.bySize)) {
    console.log(key);
  }
});

module.exports = router;

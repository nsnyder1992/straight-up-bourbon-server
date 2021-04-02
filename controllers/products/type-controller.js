require("dotenv");
const router = require("express").Router();
const ProductType = require("../../db").productType;

//is admin?
const validateSessionAdmin = require("../../middleware/validate-session-admin");

////////////////////////////////////////////////
// CREATE PRODUCT
////////////////////////////////////////////////
router.post("/create", validateSessionAdmin, (req, res) => {
  ProductType.create({
    type: req.body.type,
    description: req.body.description,
  })
    .then((type) => {
      res.status(200).json({ type });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err });
    });
});

module.exports = router;

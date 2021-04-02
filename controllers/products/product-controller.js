require("dotenv");
const router = require("express").Router();
const Product = require("../../db").product;
const Stock = require("../../db").stock;
const Descriptions = require("../../db").descriptions;

////////////////////////////////////////////////
// GET PRODUCTS (PAGINATED)
////////////////////////////////////////////////
router.get("/:page/:limit", async (req, res) => {
  //setup pagination constants
  const limit = req.params.limit;
  const offset = (req.params.page - 1) * limit;

  //get products from pagination and createdAt Descending order
  //most recent products will be sent first
  const query = {
    limit: limit,
    offset: offset,
    order: [["createdAt", "ASC"]],
    include: [
      {
        model: Stock,
      },
      {
        model: Descriptions,
      },
    ],
  };

  //get total number of products
  const count = await Product.count();

  //get products and return them with count
  Product.findAll(query)
    .then((products) => {
      const restRes = { products, total: count };
      res.status(200).json(restRes);
    })
    .catch((err) => res.status(500).json(err));
});

////////////////////////////////////////////////
// GET PRODUCT BY ID
////////////////////////////////////////////////
router.get("/:id", async (req, res) => {
  //get product by id and include descriptions
  //and stock
  const query = {
    where: { id: req.params.id },
    include: [
      {
        model: Stock,
      },
      {
        model: Descriptions,
      },
    ],
  };

  //get product and return it
  Product.findAll(query)
    .then((products) => {
      const restRes = { products };
      res.status(200).json(restRes);
    })
    .catch((err) => res.status(500).json(err));
});

//is admin?
const validateSessionAdmin = require("../../middleware/validate-session-admin");

////////////////////////////////////////////////
// CREATE PRODUCT
////////////////////////////////////////////////
router.post("/create", validateSessionAdmin, async (req, res) => {
  try {
    const product = await Product.create({
      name: req.body.name,
      type: req.body.type,
      color: req.body.color,
      description_main: req.body.description_main,
      cost: Math.floor(req.body.cost * 100),
      photoUrl: req.body.photoUrl,
      stripeProductId: req.body.stripeProductId,
    });

    console.log(req.body.description_points);

    for (point of req.body.description_points) {
      await Descriptions.create({
        productId: product.id,
        description: point,
      });
    }

    for (key of Object.keys(req.body.stock)) {
      await Stock.create({
        productId: product.id,
        size: key,
        numItems: req.body.stock[key],
      });
    }

    res.status(200).json({ product });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

////////////////////////////////////////////////
// UPDATE Product
////////////////////////////////////////////////
router.put("/:id", validateSessionAdmin, async (req, res) => {
  try {
    const postEntry = {
      name: req.body.name,
      type: req.body.type,
      color: req.body.color,
      description_main: req.body.description_main,
      cost: Math.floor(req.body.cost * 100),
      photoUrl: req.body.photoUrl,
      stripeProductId: req.body.stripeProductId,
    };

    const query = { where: { id: req.params.id } };

    //update Product
    const updatedProduct = await Product.update(postEntry, query);

    await Descriptions.destroy({
      where: { productId: req.params.id },
    });

    console.log(req.body.description_points);

    for (id of Object.keys(req.body.description_points)) {
      console.log(id);
      const description = await Descriptions.findOne({
        where: { id: parseInt(id), productId: req.params.id },
      });

      if (description !== null) {
        await Descriptions.update(
          {
            description: req.body.description_points[id],
          },
          { where: { id: id } }
        );
      } else {
        await Descriptions.create({
          productId: req.params.id,
          description: req.body.description_points[id],
        });
      }
    }

    await Stock.destroy({ where: { productId: req.params.id } });

    for (key of Object.keys(req.body.stock)) {
      const stock = await Stock.findOne({
        where: { productId: req.params.id, size: key },
      });

      if (stock !== null) {
        await Stock.update(
          {
            productId: req.params.id,
            size: key,
            numItems: req.body.stock[key],
          },
          { where: { id: stock.id } }
        );
      } else {
        await Stock.create({
          productId: req.params.id,
          size: key,
          numItems: req.body.stock[key],
        });
      }
    }

    res.status(200).json({ updatedProduct });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

///////////////////////////////////////////////////////////////
//DELETE Product
///////////////////////////////////////////////////////////////
router.delete("/:id", validateSessionAdmin, async (req, res) => {
  try {
    //destroy all descriptions
    await Descriptions.destroy({ where: { productId: req.params.id } });

    //destroy all stock
    await Stock.destroy({ where: { productId: req.params.id } });

    //destroy product
    await Product.destroy({ where: { id: req.params.id } });

    res.status(200).json({ message: "Product Removed" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

module.exports = router;

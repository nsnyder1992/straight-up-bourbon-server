require("dotenv");
const router = require("express").Router();

//aux libraries
const fetch = require("node-fetch");

//models
const Product = require("../../db").product;
const Stock = require("../../db").stock;
const Descriptions = require("../../db").descriptions;

//stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET);

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
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
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
    let stripeSizePrice = await createStripePriceIds(req);

    console.log(stripeSizePrice);

    const product = await Product.create({
      name: req.body.name,
      type: req.body.type,
      color: req.body.color,
      description_main: req.body.description_main,
      cost: Math.floor(req.body.cost * 100),
      photoUrl: req.body.photoUrl,
      stripePriceId: stripeSizePrice["none"],
    });

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
        stripePriceId: stripeSizePrice[key],
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
    };

    const query = { where: { id: req.params.id } };

    const product = await Product.findOne(query);

    //find out if cost changed
    let costChange =
      product.cost != Math.floor(req.body.cost * 100) ? true : false;

    console.log(
      "COST CHANGE: ",
      costChange,
      "COST: ",
      product.cost,
      "NEW COST: ",
      Math.floor(req.body.cost * 100)
    );

    //change in cost create new product and price
    if (costChange) postEntry.stripePriceId = await createStripePriceId(req);

    //update Product
    const updatedProduct = await Product.update(postEntry, query);

    //refresh Description Points
    await Descriptions.destroy({
      where: { productId: req.params.id },
    });

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

    //get product stock
    let stock = await Stock.findAll({
      where: { productId: req.params.id },
    });

    stock = JSON.parse(JSON.stringify(stock));

    let stripePriceIds;
    if (costChange) {
      stripePriceIds = await createStripePriceIds(req);
    }

    //delete stock not in query
    for (item of stock) {
      let deleted = true;
      for (key of Object.keys(req.body.stock)) {
        if (item.size == key) deleted = false;
      }

      if (deleted)
        await Stock.destroy({
          where: { productId: req.params.id, size: item.size },
        });

      console.log("DELETED", deleted);
    }

    //update stock
    for (key of Object.keys(req.body.stock)) {
      const item = await Stock.findOne({
        where: { productId: req.params.id, size: key },
      });

      let stockUpdate = {
        productId: req.params.id,
        size: key,
        numItems: req.body.stock[key],
      };

      if (stripePriceIds) stockUpdate.stripePriceId = stripePriceIds[key];

      if (item) {
        console.log("--PRODUCT UPDATE-- Item: ", stockUpdate);
        await Stock.update(stockUpdate, {
          where: { productId: req.params.id, size: key },
        });
      } else {
        console.log("--CREATE NEW STOOCK ITEM-- Item: ", stockUpdate);
        stockUpdate.stripePriceId = await createStripePriceIdBySize(req, key);
        await Stock.create(stockUpdate);
      }
    }

    res.status(200).json({ updatedProduct });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

///////////////////////////////////////////////////////////////
//DELETE PRODUCT
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

///////////////////////////////////////////////////////////////
// STRIPE FUNCTIONS
///////////////////////////////////////////////////////////////
async function createStripePriceId(req) {
  const stripeProduct = await stripe.products.create({
    name: req.body.name,
    images: [req.body.photoUrl],
    metadata: {
      size: "none",
    },
  });

  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: Math.floor(req.body.cost * 100),
    currency: "usd",
  });

  return stripePrice.id;
}

async function createStripePriceIdBySize(req, size) {
  const stripeProduct = await stripe.products.create({
    name: req.body.name,
    images: [req.body.photoUrl],
    metadata: {
      size: size,
    },
  });

  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: Math.floor(req.body.cost * 100),
    currency: "usd",
  });

  return stripePrice.id;
}

async function createStripePriceIds(req) {
  let stripeSize = {};
  let stripeSizePrice = {};

  //setup default pricing
  const stripeProduct = await stripe.products.create({
    name: req.body.name,
    images: [req.body.photoUrl],
    metadata: {
      size: "none",
    },
  });

  stripeSize["none"] = stripeProduct.id;

  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: Math.floor(req.body.cost * 100),
    currency: "usd",
  });

  stripeSizePrice["none"] = stripePrice.id;

  //setup specific stripPriceIds for stock sizes
  for (key of Object.keys(req.body.stock)) {
    const stripeProduct = await stripe.products.create({
      name: req.body.name,
      images: [req.body.photoUrl],
      metadata: {
        size: key,
      },
    });

    stripeSize[key] = stripeProduct.id;

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.floor(req.body.cost * 100),
      currency: "usd",
    });

    stripeSizePrice[key] = stripePrice.id;
  }

  return stripeSizePrice;
}
module.exports = router;

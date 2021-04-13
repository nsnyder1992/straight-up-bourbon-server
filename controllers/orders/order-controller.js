require("dotenv");
const router = require("express").Router();

//aux libraries
const cron = require("node-cron");
const fetch = require("node-fetch");

//products
const Product = require("../../db").product;
const Stock = require("../../db").stock;
const Orders = require("../../db").orders;

//stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET);

//auth
//is admin?
const validateSessionAdmin = require("../../middleware/validate-session-admin");

////////////////////////////////////////////////
// GET STRIPE SESSIONS
////////////////////////////////////////////////
router.get("/:page/:limit", validateSessionAdmin, async (req, res) => {
  //setup pagination constants
  const limit = req.params.limit;
  const offset = (req.params.page - 1) * limit;

  try {
    const query = {
      limit: limit,
      offset: offset,
      order: [["createdAt", "DESC"]],
    };

    const count = await Orders.count();

    const ordersTemp = await Orders.findAll(query);

    let orders = [];
    for (order of ordersTemp) {
      const session = await stripe.checkout.sessions.retrieve(order.sessionId);
      //   let items;
      const items = await stripe.checkout.sessions.listLineItems(
        order.sessionId,
        { limit: 5 }
      );

      orders.push({ order, session, items });
    }

    res.status(200).json({ orders, count });
  } catch (err) {
    res.status(500).json({ err });
  }
});

////////////////////////////////////////////////
// GET STRIPE SESSION Line ITEMS
////////////////////////////////////////////////
router.get("/:id", validateSessionAdmin, async (req, res) => {
  try {
    const order = await Orders.findOne({
      where: { id: req.params.id },
    });

    const session = await stripe.checkout.sessions.retrieve(order.sessionId);

    const items = await stripe.checkout.sessions.listLineItems(
      order.sessionId,
      { limit: 25 }
    );

    for (i in items.data) {
      let product = await Product.findOne({
        include: [
          {
            model: Stock,
            where: {
              stripePriceId: items.data[i].price.id,
            },
          },
        ],
      });

      items.data[i].product = product;
    }

    res.status(200).json({ order, session, items });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

////////////////////////////////////////////////
// GET STRIPE SESSION Line ITEMS
////////////////////////////////////////////////
router.post("/lineItems/:limit", validateSessionAdmin, async (req, res) => {
  const { session } = req.body;

  console.log(startingObj);
  //setup pagination constants
  const limit = req.params.limit;

  try {
    let query = {
      limit: limit,
    };
    if (startingObj) query.starting_after = startingObj;
    await stripe.checkout.sessions.listLineItems(
      session,
      { limit: 5 },
      function (err, lineItems) {
        // asynchronously called
        if (err) return res.status(500).json({ err });

        res.status(200).json({ lineItems });
      }
    );
  } catch (err) {
    res.status(500).json({ err });
  }
});

////////////////////////////////////////////////
// UPDATE ORDER
////////////////////////////////////////////////
router.put("/:id", validateSessionAdmin, async (req, res) => {
  const id = req.params.id;

  try {
    const response = await Orders.update(req.body, { where: { id: id } });
    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ err });
  }
});

module.exports = router;

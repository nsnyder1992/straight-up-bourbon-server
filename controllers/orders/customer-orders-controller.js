require("dotenv");
const router = require("express").Router();

//aux libraries
const cron = require("node-cron");
const fetch = require("node-fetch");

//products
const Orders = require("../../db").orders;
const CustomerOrders = require("../../db").customerOrders;

//stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET);

////////////////////////////////////////////////
// GET USER ORDERS (PAGINATED)
////////////////////////////////////////////////
router.get("/:page/:limit", async (req, res) => {
  //setup pagination constants
  const limit = req.params.limit;
  const offset = (req.params.page - 1) * limit;

  try {
    const query = {
      where: {
        userId: req.user.id,
      },
    };

    const count = await CustomerOrders.count(query);

    query.offset = offset;
    query.limit = limit;

    let userOrders = await CustomerOrders.findAll(query);
    userOrders = JSON.parse(JSON.stringify(userOrders));

    let orderIds = [];
    for (let order of userOrders) {
      orderIds.push(order.id);
    }

    const ordersTemp = await Orders.findAll({
      where: { id: orderIds },
      order: [["createdAt", "DESC"]],
    });

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
    console.log(err);
    res.status(500).json({ err });
  }
});

////////////////////////////////////////////////
// GET STRIPE SESSION LINE ITEMS
////////////////////////////////////////////////
router.get("/:id", async (req, res) => {
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

module.exports = router;

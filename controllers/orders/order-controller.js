require("dotenv");
const router = require("express").Router();

//products
const Product = require("../../db").product;
const Stock = require("../../db").stock;
const Orders = require("../../db").orders;
const CustomerOrders = require("../../db").customerOrders;

//stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET);

//auth
const validateSession = require("../../middleware/validate-session");
const validateSessionAdmin = require("../../middleware/validate-session-admin");
const { createLabel } = require("../../utils/package");
const { trackPackage } = require("../../utils/tracking");

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
      //stripe
      const session = await stripe.checkout.sessions.retrieve(order.sessionId);

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
router.get("/:id", validateSession, async (req, res) => {
  try {
    const customerOrder = await CustomerOrders.findOne({
      where: { orderId: req.params.id, userId: req.user.id },
    });

    if (customerOrder || req.user.isAdmin) {
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

      res.status(200).json({ order: order, session: session, items: items });
    } else {
      res.status(403).json({ auth: "Not Authorized" });
    }
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
// CREATE LABEL FOR ORDER
////////////////////////////////////////////////
router.post("/create/label/:id", validateSessionAdmin, async (req, res) => {
  try {
    const order = await Orders.findOne({ where: { id: req.params.id } });

    //get stripe  session
    const session = await stripe.checkout.sessions.retrieve(order.sessionId);

    const response = createLabel(session, order);
    res.status(200).json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

////////////////////////////////////////////////
// ENABLE TRACKING FOR ORDER
////////////////////////////////////////////////
router.post("/enable/tracking/:id", validateSessionAdmin, async (req, res) => {
  try {
    const order = await Orders.findOne({ where: { id: req.params.id } });

    if (!order?.trackingNumber || !order?.carrierCode)
      return res.status(200).json({
        err: "Need Both a tracking number and carrier code to track package",
      });

    const trackingEnabled = await trackPackage(
      order?.carrierCode,
      order?.trackingNumber
    );

    await order.update({
      trackingEnabled,
    });

    res.status(200).json({ order });
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

////////////////////////////////////////////////
// CANCEL ORDER
////////////////////////////////////////////////
router.put("/cancel/:id", validateSession, async (req, res) => {
  const id = req.params.id;

  try {
    const order = await CustomerOrders.findOne({
      where: { orderId: id, userId: req.user.id },
    });
    let response;
    if (order) {
      const order = await Orders.findOne({ where: { id: id } });

      if (
        !(
          order.status === "Waiting to be Fulfilled" ||
          order.status === "Invalid Address" ||
          order.status === "Label Created"
        )
      )
        return res
          .status(405)
          .json({ err: "Status of order does not allow for cancellation" });

      const session = await stripe.checkout.sessions.retrieve(order.sessionId);

      response = await cancelOrder(order, session);

      res.status(200).json({ response, refund });
    } else {
      response = "Not Authorized";
      res.status(403).json(response);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

const cancelOrder = async (order, session) => {
  const refund = await stripe.refunds.create({
    payment_intent: session.payment_intent,
    metadata: { orderId: order.id },
  });

  const response = await Orders.update(
    { status: "Canceled" },
    { where: { id: id } }
  );

  return { response, refund };
};

////////////////////////////////////////////////
// CANCEL ORDER
////////////////////////////////////////////////
router.put("/admin/cancel/:id", validateSessionAdmin, async (req, res) => {
  const id = req.params.id;
  const { stripeId } = req.body;

  try {
    const order = await Orders.findOne({ where: { id } });
    const session = await stripe.checkout.sessions.retrieve(order.sessionId);

    if (session.payment_intent != stripeId)
      return res
        .status(400)
        .json({ err: "No order with that Id and stripe id" });

    response = await cancelOrder(order, session);

    res.status(200).json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

module.exports = router;

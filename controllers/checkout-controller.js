require("dotenv");
const router = require("express").Router();

//aux libraries
const cron = require("node-cron");
const fetch = require("node-fetch");

//products
const Stock = require("../db").stock;
const Orders = require("../db").orders;

//stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;

////////////////////////////////////////////////
// CREATE STRIPE CHECKOUT SESSION
////////////////////////////////////////////////
router.post("/create", async (req, res) => {
  try {
    const CLIENTURL = process.env.CLIENT_HOST + ":" + process.env.CLIENT_PORT;

    const paymentTypes = (process.env.PAYMENT_METHOD_TYPES || "card")
      .split(",")
      .map((m) => m.trim());

    const { products, currency } = req.body;

    //build line items
    let line_items = [];
    for (let product of products) {
      if (product.quantity <= 0) continue;

      console.log(product.product);
      let prod = await Stock.findOne({
        where: { productId: product.product.id, size: product.product.size },
      });

      prod = JSON.parse(JSON.stringify(prod));

      console.log(prod);

      line_items.push({
        price: prod.stripePriceId,
        quantity: product.quantity,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentTypes,
      mode: "payment",
      line_items: line_items,
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      success_url: `${CLIENTURL}/success?session_id={CHECKOUT_SESSION_ID}}`,
      cancel_url: `${CLIENTURL}/cancel?session_id={CHECKOUT_SESSION_ID}}`,
    });

    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    res.status(500).json({ err });
  }
});

////////////////////////////////////////////////
// CREATE CHECKOUT WEBHOOK LISTENER
////////////////////////////////////////////////
router.post("/webhook", async (req, res) => {
  const payload = req.rawBody;
  const sig = req.headers["stripe-signature"];

  console.log("WEBHOOK REACHED");
  let event;

  try {
    event = await stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    console.log({ err });
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Fulfill the purchase...
    const { err, order } = await fulfillOrder(session);

    if (err) return res.status(500).json({ err });

    return res.status(200).json({ order });
  }

  res.status(500).json({ err: "Something Went Wrong" });
});

////////////////////////////////////////////////
// FULFILL ORDER FUNCTIONS
////////////////////////////////////////////////
const fulfillOrder = async (session) => {
  const { err } = await updateInventory(session);

  const order = await Orders.create({
    sessionId: session.id,
    isShipped: false,
    isFulfilled: true,
    isComplete: false,
  });

  console.log("Creating Order", session);
  return { err, order };
};

//update stock
const updateInventory = async (session) => {
  console.log("UPDATING INVENTORY", session);
  const sessionId = session.id;

  let products;
  try {
    await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items?limit=25 `,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET}`,
        },
      }
    )
      .then((response) => response.json())
      .then((json) => (products = json.data))
      .catch((err) => console.log(err));

    for (let product of products) {
      let item = await Stock.findOne({
        where: { stripePriceId: product.price.id },
      });

      item = JSON.parse(JSON.stringify(item));

      console.log("CHECKOUT UPDATE ITEMS", item, product.quantity);

      const updateStockItem = {
        numItems: item.numItems - product.quantity,
        size: item.size,
      };

      await Stock.update(updateStockItem, { where: { id: item.id } });
    }
    return products;
  } catch (err) {
    return err;
  }
};

module.exports = router;

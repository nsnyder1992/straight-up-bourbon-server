require("dotenv");
const router = require("express").Router();

//aux libraries
const cron = require("node-cron");
const fetch = require("node-fetch");
const request = require("request-promise");

//products
const Product = require("../db").product;
const Stock = require("../db").stock;
const Orders = require("../db").orders;
const User = require("../db").user;
const Meta = require("../db").meta;
const customerOrders = require("../db").customerOrders;

//stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;

//middleware
const getSession = require("../middleware/get-session");
const { sendEmail } = require("../utils/email");
const { createLabel } = require("../utils/package");

////////////////////////////////////////////////
// CREATE STRIPE CHECKOUT SESSION
////////////////////////////////////////////////
router.post("/create", getSession, async (req, res) => {
  try {
    const CLIENTURL = process.env.CLIENT_HOST;

    const paymentTypes = (process.env.PAYMENT_METHOD_TYPES || "card")
      .split(",")
      .map((m) => m.trim());

    const { products, currency } = req.body;

    //build line items
    let line_items = [];
    let totalWeight = 0;
    let totalCost = 0;
    for (let product of products) {
      if (product.quantity <= 0) continue;

      console.log(product.product);

      let prod = await Stock.findOne({
        where: { productId: product.product.id, size: product.product.size },
      });

      let p = await Product.findOne({
        where: {
          id: product.product.id,
        },
      });

      if (prod.numItems < product.quantity) {
        return res.status(200).json({
          err: `Not enough stock for the order: ${product.product.name} only has ${prod.numItems} left. Please update cart to amount before continuing`,
        });
      }

      prod = JSON.parse(JSON.stringify(prod));

      totalWeight += prod.weight;
      totalCost += p.cost;

      line_items.push({
        price: prod.stripePriceId,
        quantity: product.quantity,
      });
    }

    totalWeight /= 100;
    totalCost /= 100;

    let stripeQuery = {
      payment_method_types: paymentTypes,
      mode: "payment",
      line_items: line_items,
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      success_url: `${CLIENTURL}/success?session_id={CHECKOUT_SESSION_ID}}`,
      cancel_url: `${CLIENTURL}/cancel?session_id={CHECKOUT_SESSION_ID}}`,
    };

    let shipping_options = await getShippingOptions(totalCost, totalWeight);

    if (shipping_options.length > 0)
      stripeQuery.shipping_options = shipping_options;

    if (req.user) {
      stripeQuery.customer = req.user.stripeCustomerId;
      stripeQuery.payment_intent_data = {
        setup_future_usage: "on_session",
      };
    }

    const session = await stripe.checkout.sessions.create(stripeQuery);

    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    res.status(500).json({ err });
  }
});

const getShippingOptions = async (totalCost, totalWeight) => {
  let shipping_options = [];

  try {
    const freeShipping = Meta.findOne({
      where: { path: "Free Shipping", type: "free_shipping" },
    });

    if (freeShipping) {
      console.log("FREE COMP", totalCost, freeShipping);
      if (totalCost > freeShipping.message) {
        const min = await Meta.findOne({
          where: { path: rate.path, type: "shipping_min" },
        });

        const max = await Meta.findOne({
          where: { path: rate.path, type: "shipping_max" },
        });

        shipping_options.push({
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 0,
              currency: "usd",
            },
            display_name: rate.path,
            delivery_estimate: {
              minimum: {
                unit: "business_day",
                value: min?.message ? min.message : 2,
              },
              maximum: {
                unit: "business_day",
                value: max?.message ? max.message : 5,
              },
            },
          },
        });

        return shipping_options;
      }
    }
  } catch (err) {
    console.log(err);
  }

  try {
    const rates = await Meta.findAll({ where: { type: "shipping_rate" } });

    for (let rate of rates) {
      try {
        const min = await Meta.findOne({
          where: { path: rate.path, type: "shipping_min" },
        });

        const max = await Meta.findOne({
          where: { path: rate.path, type: "shipping_max" },
        });

        if (!min || !max) continue;

        const minWeight = await Meta.findOne({
          where: { path: rate.path, type: "shipping_min_weight" },
        });

        const maxWeight = await Meta.findOne({
          where: { path: rate.path, type: "shipping_max_weight" },
        });

        console.log(
          "TOTAL WEIGHT COMP",
          minWeight.message,
          totalCost,
          maxWeight.message
        );

        if (!min && !max) {
          console.log(minWeight.message, totalWeight, maxWeight.message);
          if (
            totalWeight > maxWeight.message ||
            totalWeight <= minWeight.message
          )
            continue;
        }

        if (!min) {
          console.log(totalWeight, minWeight.message);
          if (totalWeight <= minWeight.message) continue;
        }

        shipping_options.push({
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: Math.round(rate.message * 100),
              currency: "usd",
            },
            display_name: rate.path,
            delivery_estimate: {
              minimum: {
                unit: "business_day",
                value: min.message,
              },
              maximum: {
                unit: "business_day",
                value: max.message,
              },
            },
          },
        });
      } catch (err) {
        console.log(err);
      }
    }
  } catch (err) {
    console.log(err);
  }

  return shipping_options;
};

////////////////////////////////////////////////
// CHECKOUT WEBHOOK LISTENER
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

    console.log("SESSION:", session);

    // Fulfill the purchase...
    const { order } = await fulfillOrder(session);

    return res.status(200).json({ order });
  }

  res.status(200);
});

////////////////////////////////////////////////
// FULFILL ORDER FUNCTIONS
////////////////////////////////////////////////
const fulfillOrder = async (session) => {
  try {
    const { products } = await updateInventory(session);

    const email = session.customer_details.email;

    const selectedShippingRate = await stripe.shippingRates.retrieve(
      session.shipping_cost.shipping_rate
    );

    console.log("SHIPPING RATE:", selectedShippingRate);

    //get carrier code associated with

    const order = await Orders.create({
      sessionId: session.id,
      status: "Waiting to be Fulfilled",
      trackingEnabled: false,
      email: email ? email : "No Email Provided",
    });

    console.log("PRODUCTS RESPONSE: ", products);

    await validateAddress(session, order);

    const user = await User.findOne({
      where: { stripeCustomerId: session.customer },
    });

    if (user)
      await customerOrders.create({ orderId: order.id, userId: user.id });

    console.log("Creating Order", session);
    return { order };
  } catch (err) {
    console.log(err);
  }
};

//validate address
const validateAddress = async (session, order) => {
  try {
    console.log("SESSION", session);

    const address = session.shipping_details.address;
    const options = {
      method: "POST",
      url: "https://api.shipengine.com/v1/addresses/validate",
      headers: {
        Host: "api.shipengine.com",
        "API-Key": process.env.SHIP_ENGINE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          address_line1: address.line1,
          address_line2: address.line2,
          city_locality: address.city,
          state_province: address.state,
          postal_code: address.postal_code,
          country_code: address.country,
        },
      ]),
    };

    await request(options).then((response) => {
      console.log(response);

      const addresses = JSON.parse(response);
      matchedAddress = addresses[0].matched_address;
      console.log("ADDRESSES: ", matchedAddress);

      if (addresses[0].status === "verified") {
        // return createLabel(session, order);
        return;
      }

      order.update({ status: "Invalid Address" });

      const titleMeta = Meta.findOne({
        where: { path: "Invalid Address", type: "email_title" },
      });
      const emailMeta = Meta.findOne({
        where: { path: "Invalid Address", type: "email_message" },
      });

      const salutationMeta = Meta.findOne({
        where: { path: "*", type: "email_salutation" },
      });

      let title = "Invalid Address";

      let message =
        "Your recent order used an invalid address. \n\nIf our system has made a mistake and this is a valid address, we are sorry for the inconvenience. \n\nEither way please send us the correct Address along with the order Id in the title above. Send to: straightupbourbon@gmail.com";

      let salutation = "\n\nThanks!\n\nLuke & JP";

      if (titleMeta?.message) title = titleMeta.message;
      if (emailMeta?.message) message = emailMeta?.message;
      if (salutationMeta?.message) salutation = salutationMeta?.message;

      title += ` (Order #${order.id})`;
      message += salutation;
      sendEmail(session.customer_details.email, title, message);
    });
  } catch (err) {
    console.log(err);
  }
};

//update stock
const updateInventory = async (session) => {
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

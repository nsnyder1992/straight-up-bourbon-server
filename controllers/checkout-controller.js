require("dotenv");
const router = require("express").Router();

//aux libraries
const cron = require("node-cron");
const fetch = require("node-fetch");
const request = require("request-promise");

//products
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
    let outOfStock = [];
    let line_items = [];
    for (let product of products) {
      if (product.quantity <= 0) continue;

      console.log(product.product);

      let prod = await Stock.findOne({
        where: { productId: product.product.id, size: product.product.size },
      });

      if (prod.numItems < product.quantity) {
        outOfStock.push(product.product.id);
        continue;
      }

      prod = JSON.parse(JSON.stringify(prod));

      console.log(prod);

      line_items.push({
        price: prod.stripePriceId,
        quantity: product.quantity,
      });
    }

    if (outOfStock.length > 0)
      return res.status(200).json({ err: "Products out of stock", outOfStock });

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

    const order = await Orders.create({
      sessionId: session.id,
      status: "Waiting to be Fulfilled",
      trackingEnabled: false,
      email: session.customer_email,
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

      order.update({ status: "Invalid Address" });

      const titleMeta = Meta.findOne({
        where: { path: "Invalid Address", type: "email_title" },
      });
      const emailMeta = Meta.findOne({
        where: { path: "Invalid Address", type: "email_message" },
      });

      let title = "Invalid Address for Order: " + order.id;

      let message =
        "Your recent order used an invalid address. \n\nIf our system has made a mistake and this is a valid address, we are sorry for the inconvenience. \n\nEither way please send us the correct Address along with the order Id in the title above. Send to: straightupbourbon@gmail.com \n\nThanks!\n\nLuke & JP";

      if (titleMeta?.message) title = titleMeta.message;
      if (emailMeta?.message) message = email?.message;

      if (addresses[0].status === "verified") {
        return createShipment(session, order, matchedAddress);
      }

      sendEmail(session.customer_email, title, message);
    });
  } catch (err) {
    console.log(err);
  }
};

//create shipment
const createShipment = async (session, order, matchedAddress) => {
  try {
    const address = session.shipping.address;
    const shipTo = {
      name: session.shipping.name,
      address_line1: address.line1,
      address_line2: address.line2,
      city_locality: address.city,
      state_province: address.state,
      postal_code: address.postal_code,
      country_code: address.country,
      address_residential_indicator: "unknown",
    };

    const shipFrom = {
      company_name: process.env.COMPANY,
      name: process.env.SHIP_NAME,
      phone: process.env.SHIP_PHONE,
      address_line1: process.env.ADDRESS1,
      address_line2: process.env.ADDRESS2,
      city_locality: process.env.CITY,
      state_province: process.env.STATE,
      postal_code: process.env.ZIP,
      country_code: process.env.COUNTRY,
      address_residential_indicator: process.env.IS_RESIDENTIAL,
    };

    console.log("SHIP TO: ", shipTo);
    console.log("SHIP FROM: ", shipFrom);

    const body = JSON.stringify({
      shipment: {
        service_code: "ups_ground",
        ship_to: shipTo,
        ship_from: shipFrom,
        packages: [
          {
            weight: { value: 20, unit: "ounce" },
            dimensions: { height: 6, width: 12, length: 12, unit: "inch" },
          },
        ],
      },
    });

    var options = {
      method: "POST",
      url: "https://api.shipengine.com/v1/labels",
      headers: {
        Host: "api.shipengine.com",
        "API-Key": process.env.SHIP_ENGINE_KEY,
        "Content-Type": "application/json",
      },
      body,
    };

    await request(options)
      .then((response) => {
        const json = JSON.parse(response);
        console.log(json);
        const trackingNumber = json.tracking_number;
        const shipmentId = json.label_id;
        const carrierCode = json.carrier_code;

        console.log(
          "Shipment: ",
          shipmentId,
          "Tracking Number: ",
          trackingNumber
        );

        order.update({ shipmentId, trackingNumber, carrierCode });
        order.update({
          trackingEnabled: trackPackage(trackingNumber, carrierCode),
        });
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (err) {
    console.log(err);
  }
};

//track order

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

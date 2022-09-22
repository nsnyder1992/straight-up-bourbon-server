require("dotenv");
const router = require("express").Router();
const request = require("request-promise");

//products
const Orders = require("../../db").orders;
const CustomerOrders = require("../../db").customerOrders;
const Meta = require("../../db").meta;

//stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET);

//auth
const validateSession = require("../../middleware/validate-session");
const validateSessionAdmin = require("../../middleware/validate-session-admin");
const { sendGridEmail } = require("../../utils/email");

////////////////////////////////////////////////
// TRACK SHIPMENT BY LABEL
////////////////////////////////////////////////
router.get("/:id/:label", validateSession, async (req, res) => {
  try {
    const customerOrder = await CustomerOrders.findOne({
      where: { orderId: req.params.id, userId: req.user.id },
    });

    if (customerOrder || req.user.isAdmin) {
      const order = await Orders.findOne({
        where: { id: customerOrder.orderId },
      });

      var options = {
        method: "GET",
        url: `https://api.shipengine.com/v1/labels/${req.params.label}/track`,
        headers: {
          Host: "api.shipengine.com",
          "API-Key": process.env.SHIP_ENGINE_KEY,
          "Cache-Control": "no-cache",
        },
      };

      request(options)
        .then((response) => {
          const json = JSON.parse(response);
          console.log(json);
          const status = json.status_description;

          switch (status) {
            case "Accepted":
              order.update({ isFulfilled: true });
              break;
            case "In Transit":
              order.update({ isShipped: true });
              break;
            case "Delivered":
              order.update({ isComplete: true });
              break;
          }

          res.status(200).json({ status: status });
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({ err });
        });
    } else {
      res.status(403).json({ auth: "Not Authorized" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

////////////////////////////////////////////////
// GET LABEL BY ORDER ID
////////////////////////////////////////////////
router.get("/:id", validateSessionAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    console.log(req.body);
    const order = await Orders.findOne({
      where: { id },
    });

    const options = {
      method: "GET",
      url: `https://api.shipengine.com/v1/labels?tracking_number=${order.trackingNumber}`,
      headers: {
        Host: "api.shipengine.com",
        "API-Key": process.env.SHIP_ENGINE_KEY,
        "Cache-Control": "no-cache",
      },
    };

    request(options)
      .then((response) => {
        const json = JSON.parse(response);
        res.status(200).json(json);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ err });
      });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

////////////////////////////////////////////////
// TRACKING WEBHOOK
////////////////////////////////////////////////
router.post("/webhook/", async (req, res) => {
  try {
    if (req.headers["user-agent"] == "ShipEngine/v1") {
      console.log(req.body);

      const order = await Orders.findOne({
        where: { trackingNumber: req.body.data.tracking_number },
      });

      const session = await stripe.checkout.sessions.retrieve(order.sessionId);

      const status = req.body.data.status_description;
      const statusCode = req.body.data.status_code;

      order.update({ status, trackingEnabled: true });

      await sendStatusEmail(
        order.id,
        session.customer_details.email,
        status,
        statusCode
      );

      console.log(order);

      res.status(200).json({ msg: "success" });
    } else {
      res.status(403).json({ auth: "Not Authorized" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

////////////////////////////////////////////////
// TEST TRACKING EMAILS
////////////////////////////////////////////////
router.post("/email/test/", validateSessionAdmin, async (req, res) => {
  try {
    const { email, status, statusCode } = req.body;

    console.log("TEST EMAIL:", email, status, statusCode);

    await sendStatusEmail("TEST", email, status, statusCode);

    res.status(200).json({ msg: "success" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

const sendStatusEmail = async (orderId, email, status, statusCode) => {
  let templateId = "d-4a4687d326b8416faa466e2c0619e252";
  let title;
  let message;
  let templateMeta;
  let titleMeta;
  let emailMeta;
  let salutation =
    "If you have any questions reply to this email and we will get back with you\n\nThanks!\n\nLuke & JP";

  try {
    switch (statusCode) {
      case "AC":
        titleMeta = Meta.findOne({
          where: { path: "Tracking-Accepted", type: "email_title" },
        });
        emailMeta = Meta.findOne({
          where: { path: "Tracking-Accepted", type: "email_message" },
        });
        templateMeta = Meta.findOne({
          where: { path: "Tracking-Accepted", type: "email_template" },
        });
        title = "Straight Up Bourbon Order - ";
        status = "was accepted";
        break;

      case "IT":
        titleMeta = Meta.findOne({
          where: { path: "Tracking-Transit", type: "email_title" },
        });
        emailMeta = Meta.findOne({
          where: { path: "Tracking-Transit", type: "email_message" },
        });
        templateMeta = Meta.findOne({
          where: { path: "Tracking-Transit", type: "email_template" },
        });
        title = "Straight Up Bourbon Order - ";
        status = "has shipped!";
        break;

      case "DE":
        titleMeta = Meta.findOne({
          where: { path: "Tracking-Delivered", type: "email_title" },
        });
        emailMeta = Meta.findOne({
          where: { path: "Tracking-Delivered", type: "email_message" },
        });
        templateMeta = Meta.findOne({
          where: {
            path: "Tracking-Delivered",
            type: "email_template",
          },
        });
        title = "Straight Up Bourbon Order - ";
        status = "was delivered!";
        message = `Your order has been delivered.`;
        break;

      case "EX":
        titleMeta = Meta.findOne({
          where: { path: "Tracking-Error", type: "email_title" },
        });
        emailMeta = Meta.findOne({
          where: { path: "Tracking-Error", type: "email_message" },
        });
        templateMeta = Meta.findOne({
          where: {
            path: "Tracking-Error",
            type: "email_template",
          },
        });
        title = "Straight Up Bourbon Order - ";
        status = "Error";
        message = `Something went wrong with your delivery. Please email us and we will try to determine what happend`;
        break;

      case "UN":
        titleMeta = Meta.findOne({
          where: { path: "Tracking-Unknown", type: "email_title" },
        });
        emailMeta = Meta.findOne({
          where: { path: "Tracking-Unknown", type: "email_message" },
        });
        templateMeta = Meta.findOne({
          where: {
            path: "Tracking-Unknown",
            type: "email_template",
          },
        });
        title = "Straight Up Bourbon Order - ";
        status = "status is unknown";
        break;

      case "AT":
        titleMeta = Meta.findOne({
          where: { path: "Tracking-Attempt", type: "email_title" },
        });
        emailMeta = Meta.findOne({
          where: { path: "Tracking-Attempt", type: "email_message" },
        });
        templateMeta = Meta.findOne({
          where: {
            path: "Tracking-Attempt",
            type: "email_template",
          },
        });
        title = "Straight Up Bourbon Order - Attempted";
        status = "attempted delivery";
        message = `A Delivery Attempt has been made, but you weren't available.`;
        break;
      default:
        return;
    }

    const salutationMeta = Meta.findOne({
      where: { path: "*", type: "email_salutation" },
    });

    const signageMeta = Meta.findOne({
      where: { path: "*", type: "email_signage" },
    });

    if (templateMeta?.message) templateId = templateMeta?.message;
    if (titleMeta?.message) title = titleMeta.message;
    if (emailMeta?.message) message = emailMeta?.message;
    if (salutationMeta?.message) salutation = salutationMeta?.message;
    if (signageMeta?.message) signage = signageMeta?.message;

    title += ` (Order #${orderId})`;

    console.log("EMAIL:", title, message);
    await sendGridEmail(
      templateId,
      email,
      title,
      order.id,
      status,
      message,
      null,
      salutation,
      signage
    );
  } catch (err) {
    console.log(err);
    throw err;
  }
};

module.exports = router;

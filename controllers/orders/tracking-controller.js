require("dotenv");
const router = require("express").Router();
const request = require("request-promise");

//products
const Orders = require("../../db").orders;
const CustomerOrders = require("../../db").customerOrders;

//email
const nodemailer = require("nodemailer");

//auth
const validateSession = require("../../middleware/validate-session");
const validateSessionAdmin = require("../../middleware/validate-session-admin");

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
router.post("/:user/:pwd", async (req, res) => {
  const { user, pwd } = req.params;

  try {
    let valid = false;
    if (req.headers["user-agent"] == "ShipEngine/v1") valid = true;

    let auth = false;
    if (user === process.env.TRACK_USER && pwd === process.env.TRACK_PWD)
      auth = true;

    if (valid && auth) {
      console.log(req.body);
      const order = await Orders.findOne({
        where: { trackingNumber: req.body.data.tracking_number },
      });

      const status = req.body.data.status_description;

      switch (status.toLowerCase()) {
        case "accepted":
          order.update({ isFulfilled: true });
          break;
        case "in transit":
          order.update({ isShipped: true });
          break;
        case "delivered":
          order.update({ isComplete: true });
          break;
      }

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

module.exports = router;

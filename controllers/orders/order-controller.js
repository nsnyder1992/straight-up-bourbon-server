require("dotenv");
const router = require("express").Router();
const request = require("request-promise");

//products
const Product = require("../../db").product;
const Stock = require("../../db").stock;
const Orders = require("../../db").orders;
const CustomerOrders = require("../../db").customerOrders;

//stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET);

//email
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

//auth
const validateSession = require("../../middleware/validate-session");
const validateSessionAdmin = require("../../middleware/validate-session-admin");
const Meta = require("../../db").meta;

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

      const session = await stripe.checkout.sessions.retrieve(order.sessionId);

      const refund = await stripe.refunds.create({
        payment_intent: session.payment_intent,
      });

      response = await Orders.update(
        { isCanceled: true },
        { where: { id: id } }
      );

      //emailRefund(req.user, refund.id);

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

//email refund data
const emailRefund = async (user, refundId) => {
  const oauth2Client = new OAuth2(
    process.env.EMAIL_CLIENT_ID,
    process.env.EMAIL_CLIENT_SECRET,
    process.env.HOST
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.EMAIL_REFRESH_TOKEN,
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        reject("Failed to create access token :(");
      }
      resolve(token);
    });
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.EMAIL_ADDRESS,
      pass: process.env.EMAIL_PASSWORD,
      accessToken,
      clientId: process.env.EMAIL_CLIENT_ID,
      clientSecret: process.env.EMAIL_CLIENT_SECRET,
      refreshToken: process.env.EMAIL_REFRESH_TOKEN,
    },
  });

  const meta = await Meta.findOne({
    where: {
      type: "email",
      path: "/cancel/:id",
    },
  });

  const mailOptions = {
    from: "straightupbourbon@gmail.com",
    to: user.email,
    subject: `Refund on the way (Refund id: ${refundId}) `,
    text:
      "You are recieving this email because you have requested to cancel your order. \n\n" +
      "You should be receiving your refund within a 3-5 days. Email us back at straightupbourbon@gmail.com if you have any further questions\n\n" +
      `Refund id: ${refundId}\n\n` +
      "Thanks!\n\n" +
      "Luke & JP",
  };

  if (meta?.message) mailOptions.text = meta.message;

  console.log("sending email");

  transporter.sendMail(mailOptions, (err, response) => {
    if (err) {
      console.log("error: ", err);
    } else {
      console.log("success: ", response);
      res.status(200).json("recovery email sent");
    }
  });
};

module.exports = router;

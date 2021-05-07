require("dotenv");
const router = require("express").Router();
const User = require("../../db").user;
const CustomerOrders = require("../../db").customerOrders;

//security
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const validateSession = require("../../middleware/validate-session");

//email
const nodemailer = require("nodemailer");

//stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET);

////////////////////////////////////////////////
// CREATE USER
////////////////////////////////////////////////
router.post("/signup", (req, res) => {
  User.create({
    email: req.body.email,
    passwordHash: bcrypt.hashSync(req.body.password, 13),
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    isAdmin: false,
  })
    .then(async (user) => {
      //if first user make admin
      if (user.id === 1) {
        await User.update({ isAdmin: true }, { where: { id: 1 } })
          .then((firstUser) => (user.isAdmin = true))
          .catch((err) => console.log(err));
      }

      const customer = await stripe.customers.create({
        email: req.body.email,
      });

      await User.update(
        { stripeCustomerId: customer.id },
        { where: { id: user.id } }
      );

      //sign in user
      let token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: 60 * 60 * 24 }
      );

      res.status(200).json({
        user: user,
        message: "User successfully created",
        sessionToken: token,
      });
    })

    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err });
    });
});

////////////////////////////////////////////////
// LOGIN USER
////////////////////////////////////////////////
router.post("/login", function (req, res) {
  User.findOne({
    where: {
      email: req.body.email,
    },
  })
    .then((user) => {
      if (user) {
        bcrypt.compare(
          req.body.password,
          user.passwordHash,
          function (err, matches) {
            if (matches) {
              let token = jwt.sign(
                { id: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: 60 * 60 * 24 }
              );

              res.status(200).json({
                user: user,
                message: "User successfully Logged in",
                sessionToken: token,
              });
            } else {
              res.status(502).send({ error: "Username or Password Incorrect" });
            }
          }
        );
      } else {
        res.status(500).json({ error: "User does not exist." });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Opps, Something went wrong :(" });
    });
});

////////////////////////////////////////////////
// FORGOT PASSWORD
////////////////////////////////////////////////
router.post("/forgotPassword", (req, res) => {
  if (req.body.email === "") {
    res.status(400).json({ msg: "email required" });
  }

  User.findOne({
    where: {
      email: req.body.email,
    },
  }).then((user) => {
    if (user === null) {
      res.status(403).send("email not in db");
    } else {
      const token = crypto.randomBytes(20).toString("hex");
      user.update({
        resetPasswordToken: token,
        resetPasswordExpires: Date.now() + 3600000,
      });

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_ADDRESS,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: "straight-up-bourbon@gmail.com",
        to: user.email,
        subject: "Link to Reset Password",
        text:
          "You are recieving this email because you have requested to reset you password for your account. \n\n" +
          "Please click on the following link, or paste this into your browser to complete the process within one hour of receiving: \n\n" +
          `${process.env.CLIENT_HOST}/reset/${token} \n\n` +
          "If you did not request this, please ignore this email and your password will remain unchanged. \n",
      };

      console.log("sending email");

      transporter.sendMail(mailOptions, (err, response) => {
        if (err) {
          console.log("error: ", err);
        } else {
          console.log("success: ", response);
          res.status(200).json("recovery email sent");
        }
      });
    }
  });
});

////////////////////////////////////////////////
// UPDATE PASSWORD VIA EMAILED TOKEN
////////////////////////////////////////////////
router.put("/updatePasswordViaEmail", async (req, res) => {
  const user = await User.findOne({
    where: {
      resetPasswordToken: req.body.resetPasswordToken,
      // resetPasswordExpires: {
      //   $gt: Date.now(),
      // },
    },
  }).catch((err) => console.log(err));

  console.log(req.body.password);

  if (user === null)
    return res
      .status(404)
      .json({ message: "password reset link is invalid or has expired" });

  console.log("user exists in db");

  await user
    .update({
      passwordHash: bcrypt.hashSync(req.body.password, 13),
      resetPasswordToken: null,
      resetPasswordExpires: null,
    })
    .then(() => {
      console.log("Password Updated!");

      //sign in user
      let token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: 60 * 60 * 24 }
      );

      res
        .status(200)
        .json({ message: "Password Updated!", sessionToken: token, user });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Something went wrong :(" });
    });
});

//////////////////////////////////////////////////////////////////////
// MAKE USER ADMIN BY ID
//////////////////////////////////////////////////////////////////////
//We use validateSession here to protect the path of unknown users from
//getting our users data
router.put("/admin/:id", validateSession, (req, res) => {
  if (req.user.isAdmin) {
    User.update({ isAdmin: req.body.isAdmin }, { where: { id: req.params.id } })
      .then((response) => {
        res.status(200).json({ message: "Updated Successfully", response });
      })
      .catch((err) =>
        res
          .status(500)
          .json({ err: err, message: "Opps, something went wrong!" })
      );
  } else {
    res.status(403).json({ error: "Must be a admin" });
  }
});

//////////////////////////////////////////////////////////////////////
// GET ALL USERS (PAGINATED)
//////////////////////////////////////////////////////////////////////
//We use validateSession here to protect the path of unknown users from
//getting our users data
router.get("/:page/:limit", validateSession, async (req, res) => {
  if (req.user.isAdmin) {
    //setup pagination constants
    const limit = req.params.limit;
    const offset = (req.params.page - 1) * limit;

    const count = await User.count();

    const query = {
      limit: limit,
      offset: offset,
      order: [["createdAt", "DESC"]],
    };

    User.findAll(query)
      .then((users) => res.status(200).json({ users, count }))
      .catch((err) => res.status(500).json({ err: err }));
  } else {
    res.status(403).json({ error: "Must be a admin" });
  }
});

//////////////////////////////////////////////////////////////////////
// GET USER BY ID
//////////////////////////////////////////////////////////////////////
//We use validateSession here to protect the path of unknown users from
//getting our users data
router.get("/byId/:id", validateSession, (req, res) => {
  User.findOne({ where: { id: req.params.id } })
    .then((user) => {
      res.status(200).json({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      });
    })
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// GET LOGGED IN USER BY TOKEN
//////////////////////////////////////////////////////////////////////
//We use validateSession here to protect the path of unknown users from
//getting our users data
//This endpoint gets logged in user data from provided session Token
router.get("/self", validateSession, (req, res) => {
  User.findOne({ where: { id: req.user.id } })
    .then((user) => {
      res.status(200).json({ user });
    })
    .catch((err) => res.status(500).json({ err: err }));
});

module.exports = router;

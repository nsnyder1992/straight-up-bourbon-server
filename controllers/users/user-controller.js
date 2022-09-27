require("dotenv");
const router = require("express").Router();
const User = require("../../db").user;
const CustomerOrders = require("../../db").customerOrders;
const Meta = require("../../db").meta;

//sequelize
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

//security
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const validateSession = require("../../middleware/validate-session");

//email
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { sendGridEmail } = require("../../utils/email");
const { isRobot } = require("../../utils/recaptcha");
const OAuth2 = google.auth.OAuth2;

//stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET);

////////////////////////////////////////////////
// CREATE USER
////////////////////////////////////////////////
router.post("/signup", async (req, res) => {
  try {
    const verifyToken = crypto.randomBytes(20).toString("hex");
    const verifyExpires = Date.now() + 3600000;

    const robot = await isRobot(req.body.token);

    if (robot) return res.status(403).json({ err: "We think you are a Robot" });

    const check = await User.findOne({ where: { email: req.body.email } });
    if (check) {
      return res
        .status(500)
        .json({ error: "User already exists. Please sign in" });
    }

    User.create({
      email: req.body.email,
      passwordHash: bcrypt.hashSync(req.body.password, 13),
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      isAdmin: false,
      verifyToken,
      verifyExpires,
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

        if (user.isVerified) {
          //sign in user
          let token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: 60 * 60 * 24 }
          );

          return res.status(200).json({
            user: user,
            message: "User successfully created",
            sessionToken: token,
          });
        }

        sendVerify(user.email, verifyToken);

        res.status(200).json({
          user: user,
          message: "User successfully created",
        });
      })

      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: err });
      });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err });
  }
});

const sendVerify = (email, verifyToken) => {
  let templateId = "d-6b34ff7f582641c48bbb573b082a3e9e";

  const titleMeta = Meta.findOne({
    where: { path: "Verify-Email", type: "email_title" },
  });

  const emailMeta = Meta.findOne({
    where: { path: "Verify-Email", type: "email_message" },
  });

  const templateMeta = Meta.findOne({
    where: { path: "Verify-Email", type: "email_template" },
  });

  const salutationMeta = Meta.findOne({
    where: { path: "*", type: "email_salutation" },
  });

  const signageMeta = Meta.findOne({
    where: { path: "*", type: "email_signage" },
  });

  let title = "Verify Email";

  let message =
    "Thanks for becoming a Straight Up Bourbon User. Please click the link below to verify your email, then login!";

  let salutation = "Thanks!";

  let signage = "Luke & JP";

  if (templateMeta?.message) templateId = templateMeta?.message;
  if (titleMeta?.message) title = titleMeta.message;
  if (emailMeta?.message) message = emailMeta?.message;
  if (salutationMeta?.message) salutation = salutationMeta?.message;
  if (signageMeta?.message) signage = signageMeta?.message;

  sendGridEmail(
    templateId,
    email,
    title,
    null,
    null,
    message,
    `${process.env.CLIENT_HOST}/verify/${verifyToken}`,
    salutation,
    signage
  );
};

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
      if (!user) return res.status(500).json({ error: "User does not exist." });
      bcrypt.compare(
        req.body.password,
        user.passwordHash,
        function (err, matches) {
          if (!matches)
            return res
              .status(502)
              .send({ error: "Username or Password Incorrect" });

          if (!user.isVerified)
            return res.status(500).json({
              error: "Please verify email then come back and log in",
            });

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
        }
      );
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Opps, Something went wrong :(" });
    });
});

////////////////////////////////////////////////
// VERIFY USER
////////////////////////////////////////////////
router.post("/verify", function (req, res) {
  User.findOne({
    where: {
      verifyToken: req.body.verifyToken,
      verifyExpires: {
        [Op.gt]: Date.now(),
      },
    },
  })
    .then(async (user) => {
      if (!user) return res.status(500).json({ error: "Token Expired." });

      if (user.isVerified)
        return res.status(500).json({ error: "User already verified." });

      await user.update({
        isVerified: true,
        verifyToken: null,
        verifyExpires: null,
      });

      res.status(200).json({ message: "User Verified Please Login." });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Opps, Something went wrong :(" });
    });
});

////////////////////////////////////////////////
// VERIFY USER
////////////////////////////////////////////////
router.post("/verify/resend", function (req, res) {
  User.findOne({
    where: {
      verifyToken: req.body.verifyToken,
    },
  })
    .then(async (user) => {
      if (!user) return res.status(500).json({ error: "User Does Not Exist." });

      if (user.isVerified)
        return res.status(500).json({ error: "User already verified." });

      const verifyToken = crypto.randomBytes(20).toString("hex");
      const verifyExpires = Date.now() + 3600000;

      await user.update({ verifyToken, verifyExpires });

      await sendVerify(user.email, verifyToken);

      res.status(200).json({ message: "Verify Resent." });
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
  }).then(async (user) => {
    if (user === null) {
      res.status(403).send("email not in db");
    } else {
      const token = crypto.randomBytes(20).toString("hex");
      user.update({
        resetPasswordToken: token,
        resetPasswordExpires: Date.now() + 3600000,
      });

      const titleMeta = Meta.findOne({
        where: { path: "Reset-Password", type: "email_title" },
      });

      const emailMeta = Meta.findOne({
        where: { path: "Reset-Password", type: "email_message" },
      });

      const templateMeta = Meta.findOne({
        where: { path: "Reset-Password", type: "email_template" },
      });

      const salutationMeta = Meta.findOne({
        where: { path: "*", type: "email_salutation" },
      });

      const signageMeta = Meta.findOne({
        where: { path: "*", type: "email_signage" },
      });

      let title = "Reset Password";

      let templateId = "d-41e07bd4e5624ca78113b831b54c2eee";

      let message =
        "Click Link below to Reset Password. If you did not request this link please email us back!";

      let salutation = "Thanks!";

      let signage = "Luke & JP";

      if (templateMeta?.message) templateId = templateMeta?.message;
      if (titleMeta?.message) title = titleMeta.message;
      if (emailMeta?.message) message = emailMeta?.message;
      if (salutationMeta?.message) salutation = salutationMeta?.message;
      if (signageMeta?.message) signage = signageMeta?.message;

      sendGridEmail(
        templateId,
        user.email,
        title,
        null,
        null,
        message,
        `${process.env.CLIENT_HOST}/reset/${token}`,
        salutation,
        signage
      );

      res.status(200).json({ message: "Sent Recovery Email" });
    }
  });
});

////////////////////////////////////////////////
// UPDATE PASSWORD VIA EMAILED TOKEN
////////////////////////////////////////////////
router.put("/updatePasswordViaEmail", async (req, res) => {
  try {
    const user = await User.findOne({
      where: {
        resetPasswordToken: req.body.resetPasswordToken,
        resetPasswordExpires: {
          [Op.gt]: Date.now(),
        },
      },
    });

    if (user === null)
      return res
        .status(403)
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
  } catch (err) {
    console.log(err);
  }
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

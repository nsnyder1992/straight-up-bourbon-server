require("dotenv");
const router = require("express").Router();
const request = require("request-promise");
const { sendGridEmail } = require("../utils/email");
const { isRobot } = require("../utils/recaptcha");

////////////////////////////////////////////////
// CONTACT US
////////////////////////////////////////////////
router.post("/", async (req, res) => {
  try {
    const { name, message, token } = req.body;

    const robot = await isRobot(token);

    if (robot) return res.status(403).json({ err: "We think you are a Robot" });

    await sendGridEmail(
      "d-299735bd59304e10815c3cec363c793e",
      process.env.EMAIL_ADDRESS,
      "Customer Feedback",
      null,
      null,
      message,
      null,
      null,
      name
    );

    res.status(200).json({ message: "Email Sent" });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ err: "Opps Something went wrong on our end. Check back latter" });
  }
});

module.exports = router;

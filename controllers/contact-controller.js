require("dotenv");
const router = require("express").Router();
const request = require("request-promise");
const { sendGridEmail, sendContactUs } = require("../utils/email");
const { isRobot } = require("../utils/recaptcha");

////////////////////////////////////////////////
// CONTACT US
////////////////////////////////////////////////
router.post("/", async (req, res) => {
  try {
    const { name, email, message, token } = req.body;

    const robot = await isRobot(token);

    if (robot) return res.status(403).json({ err: "We think you are a Robot" });

    console.log("IS ROBOT:", robot);

    const response = await sendContactUs(
      "d-299735bd59304e10815c3cec363c793e",
      email,
      "Customer Feedback",
      message,
      name
    );

    console.log("SENDGRID Response:", response);
    if (response?.success)
      return res.status(200).json({ message: "Email Sent" });
    res.status(500).json({
      err: "Opps Something went wrong on our end. Check back latter",
    });
  } catch (err) {
    console.log("SENDGRID ERROR:", err);
    res
      .status(500)
      .json({ err: "Opps Something went wrong on our end. Check back latter" });
  }
});

module.exports = router;

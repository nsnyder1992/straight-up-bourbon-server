require("dotenv");
const request = require("request-promise");

const isRobot = async (token) => {
  try {
    const response = await request({
      url: `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
      method: "POST",
      resolveWithFullResponse: true,
    });
    console.log(response);

    return response.statusCode != 200;
  } catch (err) {
    console.log(err);
    return false;
  }
};

exports.isRobot = isRobot;

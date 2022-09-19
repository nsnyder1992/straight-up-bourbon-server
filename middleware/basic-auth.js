require("dotenv");
const expressBasicAuth = require("express-basic-auth");

const trackingAuth = expressBasicAuth({
  user: { TRACKING: process.env.TRACK_PWD },
});
module.exports = trackingAuth;

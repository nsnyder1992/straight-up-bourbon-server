require("dotenv");
const request = require("request-promise");

const trackPackage = async (carrierCode, trackingNumber) => {
  try {
    var options = {
      method: "POST",
      url: `https://api.shipengine.com/v1/tracking/start?carrier_code=${carrierCode}&tracking_number=${trackingNumber}`,
      headers: {
        Host: "api.shipengine.com",
        "API-Key": process.env.SHIP_ENGINE_KEY,
        "Content-Type": "application/json",
      },
      resolveWithFullResponse: true,
    };

    const response = await request(options);

    return response.statusCode == 204;
  } catch (err) {
    console.log(err);
    return false;
  }
};

exports.trackPackage = trackPackage;

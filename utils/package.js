require("dotenv");
const request = require("request-promise");
const { trackPackage } = require("./tracking");

//create createLabel
const createLabel = async (session, order) => {
  try {
    const address = session.shipping.address;
    const shipTo = {
      name: session.shipping.name,
      address_line1: address.line1,
      address_line2: address.line2,
      city_locality: address.city,
      state_province: address.state,
      postal_code: address.postal_code,
      country_code: address.country,
      address_residential_indicator: "unknown",
    };

    const shipFrom = {
      company_name: process.env.COMPANY,
      name: process.env.SHIP_NAME,
      phone: process.env.SHIP_PHONE,
      address_line1: process.env.ADDRESS1,
      address_line2: process.env.ADDRESS2,
      city_locality: process.env.CITY,
      state_province: process.env.STATE,
      postal_code: process.env.ZIP,
      country_code: process.env.COUNTRY,
      address_residential_indicator: process.env.IS_RESIDENTIAL,
    };

    console.log("SHIP TO: ", shipTo);
    console.log("SHIP FROM: ", shipFrom);

    const body = JSON.stringify({
      shipment: {
        label_image_id: process.env.SHIP_IMAGE,
        carrier_code: order.carrierCode,
        service_code: order.carrierService,
        ship_to: shipTo,
        ship_from: shipFrom,
        packages: [
          {
            weight: { value: order.weight, unit: "ounce" },
          },
        ],
      },
    });

    var options = {
      method: "POST",
      url: "https://api.shipengine.com/v1/labels",
      headers: {
        Host: "api.shipengine.com",
        "API-Key": process.env.SHIP_ENGINE_KEY,
        "Content-Type": "application/json",
      },
      body,
    };

    const response = await request(options).catch((err) => {
      console.log(err);
      return { err };
    });

    const json = JSON.parse(response);
    console.log("SHIPENGINE LABEL:", json);
    const trackingNumber = json.tracking_number;
    const shipmentId = json.label_id;
    const carrierCode = json.carrier_code;

    console.log("Shipment: ", shipmentId, "Tracking Number: ", trackingNumber);

    await order.update({
      shipmentId,
      trackingNumber,
      carrierCode,
      status: "Label Created",
    });

    const trackingEnabled = await trackPackage(carrierCode, trackingNumber);

    await order.update({
      trackingEnabled,
    });

    return { order };
  } catch (err) {
    console.log(err);
  }
};

exports.createLabel = createLabel;

//create createLabel
const getRates = async (session, weight) => {
  try {
    const address = session.shipping.address;
    const shipTo = {
      name: session.shipping.name,
      address_line1: address.line1,
      address_line2: address.line2,
      city_locality: address.city,
      state_province: address.state,
      postal_code: address.postal_code,
      country_code: address.country,
      address_residential_indicator: "unknown",
    };

    const shipFrom = {
      company_name: process.env.COMPANY,
      name: process.env.SHIP_NAME,
      phone: process.env.SHIP_PHONE,
      address_line1: process.env.ADDRESS1,
      address_line2: process.env.ADDRESS2,
      city_locality: process.env.CITY,
      state_province: process.env.STATE,
      postal_code: process.env.ZIP,
      country_code: process.env.COUNTRY,
      address_residential_indicator: process.env.IS_RESIDENTIAL,
    };

    console.log("SHIP TO: ", shipTo);
    console.log("SHIP FROM: ", shipFrom);

    const body = JSON.stringify({
      rate_options: {
        carrier_ids: ["se-123890"],
      },
      shipment: {
        ship_to: shipTo,
        ship_from: shipFrom,
        packages: [
          {
            weight: { value: weight, unit: "ounce" },
          },
        ],
      },
    });

    var options = {
      method: "POST",
      url: "https://api.shipengine.com/v1/rates",
      headers: {
        Host: "api.shipengine.com",
        "API-Key": process.env.SHIP_ENGINE_KEY,
        "Content-Type": "application/json",
      },
      body,
    };

    const response = await request(options).catch((err) => {
      console.log(err);
      return { err };
    });

    const json = JSON.parse(response);
    console.log("SHIPENGINE RATES:", json);

    return json;
  } catch (err) {
    console.log(err);
  }
};

exports.getRates = getRates;

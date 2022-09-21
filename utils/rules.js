const Rate = require("../db").rate;

const Rules = require("../db").rules;

const subCheck = (varaible, check, value) => {
  switch (check) {
    case ">":
      return varaible > value;
    case "<":
      return varaible < value;
    case ">=":
      return varaible >= value;
    case "<=":
      return varaible <= value;
    case "==":
      return varaible == value;
    case "!=":
      return varaible != value;
    default:
      throw "not a check";
  }
};

const ruleChain = (rule, result, variables) => {
  switch (rule.type) {
    case "&&":
      return (
        result && subCheck(variables[rule.varaible], rule.function, rule.value)
      );
    case "||":
      return (
        result || subCheck(variables[rule.varaible], rule.function, rule.value)
      );
    case "start":
      return subCheck(variables[rule.varaible], rule.function, rule.value);
    default:
      throw "not a check";
  }
};

const checkRules = (rateId, varaibles) => {
  const rules = Rules.findAll({ where: { rateId }, order: [["id"]] });

  let result = true;
  for (let rule of rules) {
    result = ruleChain(rule, result, varaibles);
  }
  return result;
};

const getShippingRates = async (variables) => {
  try {
    const rates = await Rate.findAll({ where: { type: "shipping_rate" } });

    let apply = [];
    for (let rate of rates) {
      let result = checkRules(rate.id, variables);

      if (result === true) {
        if (rate.value == 0) {
          apply = [rate];
          break;
        }
        apply.push(rate);
      }
    }

    let shipping_options = [];

    for (let rate of apply) {
      shipping_options.push({
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: rate.value,
            currency: "usd",
          },
          display_name: freePath,
          delivery_estimate: {
            minimum: {
              unit: "business_day",
              value: rate.minDays,
            },
            maximum: {
              unit: "business_day",
              value: rate.maxDays,
            },
          },
        },
      });
    }

    return shipping_options;
  } catch (err) {
    console.log(err);
  }
};

exports.getShippingRates = getShippingRates;

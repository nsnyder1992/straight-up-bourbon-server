const Rate = require("../db").rate;

const Rules = require("../db").rules;

const subCheck = (variable, check, value) => {
  console.log("CHECK", variable, check, value);
  switch (check) {
    case ">":
      return variable > value;
    case "<":
      return variable < value;
    case ">=":
      return variable >= value;
    case "<=":
      return variable <= value;
    case "==":
      return variable == value;
    case "!=":
      return variable != value;
    default:
      throw "not a check";
  }
};

const ruleChain = (rule, result, variables) => {
  console.log(
    "CHAIN",
    rule.type,
    result,
    rule.variable,
    variables[rule.variable],
    rule.value
  );
  switch (rule.type) {
    case "&&":
      return (
        result && subCheck(variables[rule.variable], rule.function, rule.value)
      );
    case "||":
      return (
        result || subCheck(variables[rule.variable], rule.function, rule.value)
      );
    case "start":
      return subCheck(variables[rule.variable], rule.function, rule.value);
    default:
      throw "not a check";
  }
};

const checkRules = async (rateId, varaibles) => {
  const rules = await Rules.findAll({ where: { rateId }, order: [["id"]] });

  let result = true;
  for (let rule of rules) {
    console.log("PROCESSING:", rule.id);
    result = ruleChain(rule, result, varaibles);
  }
  return result;
};

const getShippingRates = async (variables) => {
  try {
    const rates = await Rate.findAll({ where: { type: "shipping_rate" } });

    let apply = [];
    for (let rate of rates) {
      let result = await checkRules(rate.id, variables);
      console.log("PROCESSED RULES:", rate.id, variables, result);

      if (result === true) {
        if (rate.value == 0) {
          apply = [rate];
          break;
        }
        apply.push(rate);
      }
    }

    console.log("APPLY", apply);

    let shipping_options = [];

    for (let rate of apply) {
      shipping_options.push({
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: rate.value,
            currency: "usd",
          },
          display_name: rate.name,
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

    console.log(shipping_options);
    return shipping_options;
  } catch (err) {
    console.log(err);
  }
};

exports.getShippingRates = getShippingRates;

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

const getShippingRates = (variables) => {
  const rates = Rate.findAll({ where: { type: "shipping_rate" } });

  let apply = [];
  for (let rate of rates) {
    let result = checkRules(rate.id, variables);

    if (result === true) apply.push(rate);
  }

  return apply;
};

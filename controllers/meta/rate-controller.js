require("dotenv");
const router = require("express").Router();
const Rate = require("../../db").rate;
const Rules = require("../../db").rules;

//auth
const validateSessionAdmin = require("../../middleware/validate-session-admin");

////////////////////////////////////////////////
// CREATE RATE
////////////////////////////////////////////////
router.post("/", validateSessionAdmin, async (req, res) => {
  try {
    const rate = Rate.create({
      name: req.body.name,
      rate: req.body.rate,
      carrierCode: req.body.carrierCode,
      carrierService: req.body.carrierService,
      type: req.body.type,
    });

    for (let rule of req.body.rules) {
      await Rules.create({
        rateId: rate.id,
        type: rule.type,
        variable: rule.variable,
        function: rule.rule,
        value: rule.value,
      });
    }

    const query = {
      where: { id: rate.id },
      include: [
        {
          model: Rules,
        },
      ],
    };

    const resRate = await Rate.findOne(query);

    res.status(200).json({
      rate: resRate,
      message: "Rate successfully created",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err });
  }
});

//////////////////////////////////////////////////////////////////////
// GET ALL RATES
//////////////////////////////////////////////////////////////////////
router.get("/:page/:limit", async (req, res) => {
  //get rates from pagination and createdAt Descending order
  //most recent rates will be sent first
  const query = {
    limit: limit,
    offset: offset,
    order: [[Rules, id]],
    include: [
      {
        model: Rules,
      },
    ],
  };

  //get total number of rates
  const count = await Rate.count();

  Rate.findAll(query)
    .then((rates) => res.status(200).json({ rates, total: count }))
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// GET RATE BY ID
//////////////////////////////////////////////////////////////////////
router.get("/:id", (req, res) => {
  //get rate by id and include rules
  const query = {
    where: { id: req.params.id },
    include: [
      {
        model: Rules,
      },
    ],
  };

  Rate.findOne(query)
    .then((rate) => {
      res.status(200).json({ rate });
    })
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// UPDATE RATE
//////////////////////////////////////////////////////////////////////
router.put("/:id", validateSessionAdmin, async (req, res) => {
  try {
    const rate = await Rate.findOne({ where: { id: req.params.id } });

    await rate.update({
      name: req.body.name,
      rate: req.body.rate,
      carrierCode: req.body.carrierCode,
      carrierService: req.body.carrierService,
      type: req.body.type,
    });

    //get rate rules
    let rules = await Rules.findAll({
      where: { productId: req.params.id },
    });

    //delete rules not in query
    for (let rule of rules) {
      let deleted = true;
      for (let key of Object.keys(req.body.rules)) {
        if (rule.id == key) {
          deleted = false;
          break;
        }
      }

      if (!deleted) continue;

      await Rules.destroy({
        where: { id: rule.id },
      });
    }

    //update rules
    for (key of Object.keys(req.body.rules)) {
      const rule = await Rules.findOne({
        where: { id: key },
      });

      console.log(req.body);
      let ruleUpdate = {
        rateId: rate.id,
        type: rule.type,
        variable: rule.variable,
        function: rule.rule,
        value: rule.value,
      };

      if (rule) {
        console.log("--PRODUCT UPDATE-- Item: ", stockUpdate);
        await rule.update(ruleUpdate);
      } else {
        console.log("--CREATE NEW STOCK ITEM-- Item: ", stockUpdate);
        await Stock.create(ruleUpdate);
      }
    }

    res.status(200).json({ rate });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
});

//////////////////////////////////////////////////////////////////////
// DELETE RATE
//////////////////////////////////////////////////////////////////////
router.delete("/:id", validateSessionAdmin, async (req, res) => {
  try {
    //delete associated rules
    await Rules.destroy({ where: { rateId: req.params.id } });

    //delete rate
    await Rate.destroy({ where: { id: req.params.id } });

    res.status(200).json({ message: "Rate Removed" });
  } catch (err) {
    res.status(500).json({ err: err });
  }
});

module.exports = router;

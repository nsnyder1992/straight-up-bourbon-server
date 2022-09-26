require("dotenv");
const router = require("express").Router();
const Bourbon = require("../../db").bourbon;

//special db operators
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

//auth
const validateSessionAdmin = require("../../middleware/validate-session-admin");

////////////////////////////////////////////////
// CREATE BOURBON
////////////////////////////////////////////////
router.post("/", validateSessionAdmin, (req, res) => {
  console.log(req.body);
  Bourbon.create({ ...req.body })
    .then(async (bourbon) => {
      res.status(200).json({ ...bourbon });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err });
    });
});

//////////////////////////////////////////////////////////////////////
// GET SELECTIONS
//////////////////////////////////////////////////////////////////////
router.get("/selections", (req, res) => {
  Bourbon.findAll({
    where: { selection: { [Op.ne]: null } },
    order: [["updatedAt"], ["selection", "DESC"]],
    limit: 2,
  })
    .then((bourbons) => {
      res.status(200).json({ bourbons });
    })
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// GET ALL BOURBONS
//////////////////////////////////////////////////////////////////////
router.get("/:page/:limit", async (req, res) => {
  //setup pagination constants
  const limit = req.params.limit;
  const offset = (req.params.page - 1) * limit;

  const query = {
    limit: limit,
    offset: offset,
    order: [["createdAt", "ASC"]],
  };

  //get total number of products
  const total = await Bourbon.count();

  Bourbon.findAll(query)
    .then((bourbons) => res.status(200).json({ bourbons, total }))
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// GET BOURBON BY ID
//////////////////////////////////////////////////////////////////////
router.get("/:id", validateSessionAdmin, (req, res) => {
  Bourbon.findOne({ where: { id: req.params.id } })
    .then((bourbon) => {
      res.status(200).json({ ...bourbon });
    })
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// UPDATE BOURBON
//////////////////////////////////////////////////////////////////////
router.put("/:id", validateSessionAdmin, async (req, res) => {
  try {
    const update = {
      name: req.body.name,
      description: req.body.description,
      aroma: req.body.aroma,
      taste: req.body.taste,
      link: req.body.link,
      distillery: req.body.distillery,
      year: req.body.year,
      selection: req.body.selection,
    };

    const bourbon = await Bourbon.findOne({ where: { id: req.params.id } });

    await bourbon.update(update);

    res.status(200).json({ ...bourbon });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
});

//////////////////////////////////////////////////////////////////////
// DELETE BOURBON
//////////////////////////////////////////////////////////////////////
router.delete("/:id", validateSessionAdmin, async (req, res) => {
  try {
    await Bourbon.destroy({ where: { id: req.params.id } });

    res.status(200).json({ message: "Bourbon Removed" });
  } catch (err) {
    res.status(500).json({ err: err });
  }
});

module.exports = router;
